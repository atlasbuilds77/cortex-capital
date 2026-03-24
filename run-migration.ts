import { Pool } from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const sql = fs.readFileSync('migrations/006_auth_tables.sql', 'utf8');
  try {
    await pool.query(sql);
    console.log('Migration 006 completed');
  } catch (err: any) {
    console.error('Migration error:', err.message);
  }
  await pool.end();
}

run();
