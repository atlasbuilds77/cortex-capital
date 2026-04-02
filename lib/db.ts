import pg from 'pg';

let cachedPool: pg.Pool | null = null;

function getDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return dbUrl;
}

export function getPool() {
  if (!cachedPool) {
    cachedPool = new pg.Pool({
      connectionString: getDatabaseUrl(),
      ssl: { rejectUnauthorized: false },
    });
  }
  return cachedPool;
}

export const pool = {
  query: (...args: Parameters<pg.Pool['query']>) => getPool().query(...args),
};

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await getPool().query(text, params);
  const duration = Date.now() - start;
  console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
}
