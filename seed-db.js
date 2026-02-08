#!/usr/bin/env node
/**
 * Seed database with initial data
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

async function runSeed(client, filePath) {
  const fileName = path.basename(filePath);
  console.log(`📄 Seeding ${fileName}...`);
  
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
    console.log(`✅ Connected`);
    
    // Run seeds in order
    const seeds = [
      path.join(__dirname, 'database/seeds/01_initial_policies.sql'),
      path.join(__dirname, 'database/seeds/02_trigger_rules.sql'),
      path.join(__dirname, 'database/seeds/03_agent_relationships.sql'),
      path.join(__dirname, 'database/seeds/04_agent_definitions.sql')
    ];
    
    for (const seedFile of seeds) {
      const success = await runSeed(client, seedFile);
      if (!success) {
        console.error('❌ Seeding failed, stopping');
        process.exit(1);
      }
    }
    
    console.log('\n🎉 Database seeding complete!');
    
    // Show summary
    const summaryQueries = [
      { name: 'Policies', query: 'SELECT COUNT(*) FROM ops_policy' },
      { name: 'Trigger Rules', query: 'SELECT COUNT(*) FROM ops_trigger_rules' },
      { name: 'Agent Relationships', query: 'SELECT COUNT(*) FROM ops_agent_relationships' },
      { name: 'Agent Memory', query: 'SELECT COUNT(*) FROM ops_agent_memory' }
    ];
    
    console.log('\n📊 Data Summary:');
    for (const { name, query } of summaryQueries) {
      const result = await client.query(query);
      console.log(`   - ${name}: ${result.rows[0].count} rows`);
    }
    
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
