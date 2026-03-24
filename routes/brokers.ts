// Broker Management Routes
// Connect, disconnect, sync brokers

import { FastifyInstance } from 'fastify';
import { authenticate, AuthenticatedRequest } from '../lib/auth';
import { ConnectBrokerSchema, validateBody } from '../lib/validation';
import { query } from '../integrations/database';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 characters');
}

// Simple encryption for credentials (use a proper KMS in production)
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY!), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encryptedText = parts.join(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY!), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function brokerRoutes(server: FastifyInstance) {
  // GET /api/brokers - List connected brokers
  server.get('/api/brokers', {
    preHandler: authenticate,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const result = await query(
        `SELECT id, broker, connected_at, last_sync
         FROM brokerage_connections
         WHERE user_id = $1
         ORDER BY connected_at DESC`,
        [request.user!.userId]
      );
      
      return {
        success: true,
        data: result.rows,
      };
    } catch (error: any) {
      server.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
  
  // POST /api/brokers/connect - Connect new broker
  server.post<{
    Body: {
      broker: string;
      credentials: any;
    };
  }>('/api/brokers/connect', {
    preHandler: authenticate,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const data = validateBody(ConnectBrokerSchema, request.body);
      
      // Check if broker already connected
      const existing = await query(
        `SELECT id FROM brokerage_connections WHERE user_id = $1 AND broker = $2`,
        [request.user!.userId, data.broker]
      );
      
      if (existing.rows.length > 0) {
        return reply.status(400).send({
          success: false,
          error: 'Broker already connected',
        });
      }
      
      // Encrypt credentials
      const encryptedCredentials = encrypt(JSON.stringify(data.credentials));
      
      // Test connection based on broker type
      let connectionValid = false;
      try {
        switch (data.broker) {
          case 'tradier':
            if (!data.credentials.token) {
              throw new Error('Tradier token required');
            }
            // TODO: Test Tradier connection
            connectionValid = true;
            break;
            
          case 'alpaca':
            if (!data.credentials.api_key || !data.credentials.api_secret) {
              throw new Error('Alpaca API key and secret required');
            }
            // TODO: Test Alpaca connection
            connectionValid = true;
            break;
            
          case 'robinhood':
            if (!data.credentials.username || !data.credentials.password) {
              throw new Error('Robinhood username and password required');
            }
            // TODO: Test Robinhood connection
            connectionValid = true;
            break;
            
          case 'webull':
            if (!data.credentials.username || !data.credentials.password) {
              throw new Error('Webull username and password required');
            }
            // TODO: Test Webull connection
            connectionValid = true;
            break;
            
          default:
            throw new Error('Unsupported broker');
        }
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: `Connection test failed: ${error.message}`,
        });
      }
      
      // Save connection
      const result = await query(
        `INSERT INTO brokerage_connections (user_id, broker, credentials_encrypted, last_sync)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, broker, connected_at, last_sync`,
        [request.user!.userId, data.broker, encryptedCredentials]
      );
      
      // Audit
      await query(
        `INSERT INTO audit_log (user_id, action, metadata)
         VALUES ($1, 'broker_connected', $2)`,
        [request.user!.userId, JSON.stringify({ broker: data.broker })]
      );
      
      return {
        success: true,
        data: result.rows[0],
      };
    } catch (error: any) {
      server.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
  
  // DELETE /api/brokers/:id - Disconnect broker
  server.delete<{
    Params: { id: string };
  }>('/api/brokers/:id', {
    preHandler: authenticate,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { id } = request.params;
      
      // Verify ownership
      const existing = await query(
        `SELECT broker FROM brokerage_connections WHERE id = $1 AND user_id = $2`,
        [id, request.user!.userId]
      );
      
      if (existing.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Broker connection not found',
        });
      }
      
      const broker = existing.rows[0].broker;
      
      // Delete connection
      await query(
        `DELETE FROM brokerage_connections WHERE id = $1`,
        [id]
      );
      
      // Audit
      await query(
        `INSERT INTO audit_log (user_id, action, metadata)
         VALUES ($1, 'broker_disconnected', $2)`,
        [request.user!.userId, JSON.stringify({ broker, connection_id: id })]
      );
      
      return {
        success: true,
        message: 'Broker disconnected successfully',
      };
    } catch (error: any) {
      server.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
  
  // GET /api/brokers/:id/sync - Force sync broker data
  server.get<{
    Params: { id: string };
  }>('/api/brokers/:id/sync', {
    preHandler: authenticate,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { id } = request.params;
      
      // Get connection
      const result = await query(
        `SELECT broker, credentials_encrypted FROM brokerage_connections 
         WHERE id = $1 AND user_id = $2`,
        [id, request.user!.userId]
      );
      
      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Broker connection not found',
        });
      }
      
      const { broker, credentials_encrypted } = result.rows[0];
      const credentials = JSON.parse(decrypt(credentials_encrypted));
      
      // Sync data based on broker type
      let syncData: any = {};
      
      try {
        switch (broker) {
          case 'tradier':
            // TODO: Sync Tradier data
            syncData = { message: 'Tradier sync not yet implemented' };
            break;
            
          case 'alpaca':
            // TODO: Sync Alpaca data
            syncData = { message: 'Alpaca sync not yet implemented' };
            break;
            
          case 'robinhood':
            // TODO: Sync Robinhood data
            syncData = { message: 'Robinhood sync not yet implemented' };
            break;
            
          case 'webull':
            // TODO: Sync Webull data
            syncData = { message: 'Webull sync not yet implemented' };
            break;
        }
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: `Sync failed: ${error.message}`,
        });
      }
      
      // Update last_sync timestamp
      await query(
        `UPDATE brokerage_connections SET last_sync = NOW() WHERE id = $1`,
        [id]
      );
      
      return {
        success: true,
        data: {
          broker,
          last_sync: new Date().toISOString(),
          sync_data: syncData,
        },
      };
    } catch (error: any) {
      server.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });
}
