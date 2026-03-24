// Cortex Capital - Database Client
// Connects to Supabase PostgreSQL
//
// PRODUCTION NOTES:
// - Connection pool is managed automatically
// - Call shutdown() on process exit
// - Queries are logged in development only

import { Pool, PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const DB_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: true } // Strict in production
    : { rejectUnauthorized: false }, // Permissive in development
  // Pool settings
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Fail if can't connect in 10s
};

// Validate configuration
if (!process.env.DATABASE_URL) {
  // Don't expose variable name in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Database configuration error'
    : 'DATABASE_URL not set in environment';
  throw new Error(message);
}

const pool = new Pool(DB_CONFIG);

// Handle pool errors (prevents uncaught exceptions)
pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err);
});

// Handle pool connection events (development logging)
if (process.env.NODE_ENV !== 'production') {
  pool.on('connect', () => {
    console.log('[DB] New client connected to pool');
  });
  
  pool.on('remove', () => {
    console.log('[DB] Client removed from pool');
  });
}

/**
 * Execute a query with automatic connection management
 */
export const query = async (
  text: string, 
  params?: any[]
): Promise<QueryResult> => {
  const start = Date.now();
  
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Only log in development (avoid log spam in production)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DB Query]', { 
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration,
        rows: res.rowCount,
      });
    }
    
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    console.error('[DB Query Error]', { 
      text: text.substring(0, 100),
      duration,
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Get a client for transaction or multi-query operations.
 * IMPORTANT: Always call client.release() when done.
 */
export const getClient = async (): Promise<PoolClient> => {
  const client = await pool.connect();
  return client;
};

/**
 * Execute multiple queries in a transaction
 */
export const transaction = async <T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get pool statistics (for monitoring)
 */
export const getPoolStats = () => ({
  totalCount: pool.totalCount,
  idleCount: pool.idleCount,
  waitingCount: pool.waitingCount,
});

/**
 * Gracefully shutdown the pool
 * Call this on process exit (SIGTERM, SIGINT)
 */
export const shutdown = async (): Promise<void> => {
  console.log('[DB] Shutting down connection pool...');
  await pool.end();
  console.log('[DB] Connection pool closed');
};

// Register shutdown handlers
const handleShutdown = async (signal: string) => {
  console.log(`[DB] Received ${signal}, closing connections...`);
  await shutdown();
  process.exit(0);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default pool;
