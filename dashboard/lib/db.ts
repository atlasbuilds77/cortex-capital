/**
 * Database client for Cortex Capital Dashboard
 * Simplified for Vercel deployment - no external dependencies
 */

import { Pool } from 'pg';

// Database client interface
export interface DbClient {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<{ rowCount: number }>;
}

// PostgreSQL client
class PostgresDb implements DbClient {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000,
    });
    
    // Handle pool errors
    this.pool.on('error', (err: Error) => {
      console.error('[PostgresDb] Unexpected pool error:', err);
    });
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    try {
      const result = await this.pool.query(sql, params);
      return result.rows as T[];
    } catch (error) {
      console.error('[PostgresDb] Query failed:', sql.substring(0, 100), error);
      throw error;
    }
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results[0] || null;
  }

  async execute(sql: string, params?: any[]): Promise<{ rowCount: number }> {
    try {
      const result = await this.pool.query(sql, params);
      return { rowCount: result.rowCount || 0 };
    } catch (error) {
      console.error('[PostgresDb] Execute failed:', sql.substring(0, 100), error);
      throw error;
    }
  }

  async close(): Promise<void> {
    console.log('[PostgresDb] Draining connection pool...');
    await this.pool.end();
  }
}

// Singleton database instance
let _db: DbClient | null = null;

export function getDb(): DbClient {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable not set');
    }
    _db = new PostgresDb(connectionString);
  }
  return _db;
}
