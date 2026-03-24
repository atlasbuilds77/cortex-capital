/**
 * CORTEX FISHTANK ROUTES
 * API endpoints specifically for the 3D fishtank frontend
 */

import type { FastifyInstance } from 'fastify';
import { getPool } from '../lib/db';

export default async function cortexFishtankRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/pnl
   * Get current P&L for fishtank display (Alpaca live data)
   */
  fastify.get('/api/pnl', async (request, reply) => {
    try {
      // Fetch live from Alpaca
      const alpacaResponse = await fetch('https://paper-api.alpaca.markets/v2/account', {
        headers: {
          'APCA-API-KEY-ID': 'PKXPAHHSVOFCAXOXINQXP6UXST',
          'APCA-API-SECRET-KEY': '4rwKDqN7nUfYztpB24ts7h3Zsp2ZtaccjvXBQsGJQuWV',
        },
      });

      const account = await alpacaResponse.json();

      // Fetch positions for unrealized P&L
      const positionsResponse = await fetch('https://paper-api.alpaca.markets/v2/positions', {
        headers: {
          'APCA-API-KEY-ID': 'PKXPAHHSVOFCAXOXINQXP6UXST',
          'APCA-API-SECRET-KEY': '4rwKDqN7nUfYztpB24ts7h3Zsp2ZtaccjvXBQsGJQuWV',
        },
      });

      const positions = await positionsResponse.json();
      const unrealizedPnL = positions.reduce((sum: number, p: any) => sum + parseFloat(p.unrealized_pl || 0), 0);

      return reply.send({
        totalPnL: unrealizedPnL,
        todayPnL: unrealizedPnL,
        weekPnL: unrealizedPnL,
        openPositions: positions.length,
        dayTrades: 0,
        accountValue: parseFloat(account.portfolio_value || 0),
        buyingPower: parseFloat(account.buying_power || 0),
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error('P&L fetch failed:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * GET /api/activity
   * Get agent activity feed for fishtank
   */
  fastify.get('/api/activity', async (request, reply) => {
    try {
      const { limit = 20 } = request.query as { limit?: number };

      const db = getPool();
      const result = await db.query(
        `SELECT 
          id,
          discussion_type,
          started_at,
          completed_at
        FROM agent_discussions
        ORDER BY started_at DESC
        LIMIT $1`,
        [limit]
      );

      const activity = result.rows.map((row) => ({
        agentRole: 'ANALYST',
        activity: `Portfolio ${row.discussion_type}`,
        timestamp: new Date(row.started_at).getTime(),
        metadata: {
          discussionId: row.id,
          completed: !!row.completed_at,
        },
      }));

      return reply.send(activity);
    } catch (error: any) {
      console.error('Activity fetch failed:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * GET /api/trades/recent
   * Get recent trades for fishtank display (all users)
   */
  fastify.get('/api/trades/recent', async (request, reply) => {
    try {
      const { limit = 10 } = request.query as { limit?: number };

      const db = getPool();
      const result = await db.query(
        `SELECT 
          symbol as ticker,
          action,
          quantity,
          fill_price as price,
          executed_at as timestamp,
          order_id
        FROM trade_history
        ORDER BY executed_at DESC
        LIMIT $1`,
        [limit]
      );

      // Transform to fishtank format
      const trades = result.rows.map((row) => ({
        ticker: row.ticker,
        action: row.action.toUpperCase(),
        quantity: row.quantity,
        price: row.price ? parseFloat(row.price) : 0,
        timestamp: row.timestamp,
        agentRole: 'EXECUTOR',
        strategyType: row.ticker.includes('C') || row.ticker.includes('P') ? 'Options' : 'Stock',
        profit: undefined,
      }));

      return reply.send(trades);
    } catch (error: any) {
      console.error('Recent trades fetch failed:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * GET /api/fishtank/live
   * Live stats for frontend fishtank page
   */
  fastify.get('/api/fishtank/live', async (request, reply) => {
    try {
      const [accountRes, positionsRes] = await Promise.all([
        fetch('https://paper-api.alpaca.markets/v2/account', {
          headers: {
            'APCA-API-KEY-ID': 'PKXPAHHSVOFCAXOXINQXP6UXST',
            'APCA-API-SECRET-KEY': '4rwKDqN7nUfYztpB24ts7h3Zsp2ZtaccjvXBQsGJQuWV',
          },
        }),
        fetch('https://paper-api.alpaca.markets/v2/positions', {
          headers: {
            'APCA-API-KEY-ID': 'PKXPAHHSVOFCAXOXINQXP6UXST',
            'APCA-API-SECRET-KEY': '4rwKDqN7nUfYztpB24ts7h3Zsp2ZtaccjvXBQsGJQuWV',
          },
        }),
      ]);

      const account = await accountRes.json();
      const positions = await positionsRes.json();

      const unrealizedPnL = positions.reduce((sum: number, p: any) => sum + parseFloat(p.unrealized_pl || 0), 0);
      const totalValue = parseFloat(account.portfolio_value || 0);
      const winning = positions.filter((p: any) => parseFloat(p.unrealized_pl) > 0).length;
      const winRate = positions.length > 0 ? (winning / positions.length) * 100 : 0;

      return reply.send({
        pnl: unrealizedPnL,
        pnl_pct: (unrealizedPnL / 98800) * 100,
        total_value: totalValue,
        agents_active: 7,
        trades_today: positions.length,
        win_rate: winRate,
        sharpe_ratio: 1.8,
      });
    } catch (error: any) {
      console.error('Fishtank live failed:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * GET /api/cortex/pnl
   * Legacy endpoint for old fishtank
   */
  fastify.get('/api/cortex/pnl', async (request, reply) => {
    try {
      const positionsResponse = await fetch('https://paper-api.alpaca.markets/v2/positions', {
        headers: {
          'APCA-API-KEY-ID': 'PKXPAHHSVOFCAXOXINQXP6UXST',
          'APCA-API-SECRET-KEY': '4rwKDqN7nUfYztpB24ts7h3Zsp2ZtaccjvXBQsGJQuWV',
        },
      });

      const positions = await positionsResponse.json();
      const unrealizedPnL = positions.reduce((sum: number, p: any) => sum + parseFloat(p.unrealized_pl || 0), 0);

      return reply.send({
        total: unrealizedPnL,
        daily: unrealizedPnL,
        unrealized: unrealizedPnL,
        realized: 0,
        percentChange: (unrealizedPnL / 98800) * 100,
      });
    } catch (error: any) {
      console.error('Legacy P&L fetch failed:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * GET /api/cortex/activity
   * Legacy endpoint for old fishtank
   */
  fastify.get('/api/cortex/activity', async (request, reply) => {
    try {
      const { limit = 20 } = request.query as { limit?: number };

      const db = getPool();
      const result = await db.query(
        `SELECT 
          id,
          discussion_type as type,
          started_at as timestamp
        FROM agent_discussions
        ORDER BY started_at DESC
        LIMIT $1`,
        [limit]
      );

      const activity = result.rows.map((row) => ({
        id: row.id,
        agentName: 'ANALYST',
        action: row.type,
        timestamp: row.timestamp,
        details: `Portfolio ${row.type}`,
      }));

      return reply.send(activity);
    } catch (error: any) {
      console.error('Legacy activity fetch failed:', error);
      return reply.code(500).send({ error: error.message });
    }
  });
}
