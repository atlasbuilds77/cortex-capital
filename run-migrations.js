#!/usr/bin/env node
/**
 * Run database migrations for Cortex Capital
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:k0Yb2ESDIksIKTS2@db.lbwbgbujgribraeluzuv.supabase.co:5432/postgres';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration(client, filePath) {
  const fileName = path.basename(filePath);
  console.log(`📄 Running ${fileName}...`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await client.query(sql);
    console.log(`✅ ${fileName} completed`);
    return true;
  } catch (error) {
    console.error(`❌ ${fileName} failed:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔗 Connecting to Supabase...');
  
  const client = await pool.connect();
  
  try {
    // Test connection
    const versionResult = await client.query('SELECT version()');
    const version = versionResult.rows[0].version;
    console.log(`✅ Connected to: ${version.substring(0, 50)}...`);
    
    // Run migrations in order
    const migrations = [
      path.join(__dirname, 'database/migrations/001_initial_schema.sql'),
      path.join(__dirname, 'database/migrations/002_cap_gates_atomic.sql')
    ];
    
    for (const migrationFile of migrations) {
      const success = await runMigration(client, migrationFile);
      if (!success) {
        console.error('❌ Migration failed, stopping');
        process.exit(1);
      }
    }
    
    // Verify tables created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'ops_%'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows;
    console.log(`\n✅ Created ${tables.length} tables:`);
    tables.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    console.log('\n🎉 Database migrations complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
