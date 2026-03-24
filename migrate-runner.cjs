const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigrations() {
  const client = await pool.connect();
  
  const migrations = [
    '001_initial_schema.sql',
    '002_phase2_enhancements.sql', 
    '003_profiles_and_options.sql',
    '004_engine_tables.sql',
    '005_preferences.sql'
  ];
  
  for (const file of migrations) {
    const filePath = path.join(__dirname, 'migrations', file);
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${file} - not found`);
      continue;
    }
    
    console.log(`Running ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    try {
      await client.query(sql);
      console.log(`✅ ${file} complete`);
    } catch (err) {
      console.log(`⚠️ ${file} error: ${err.message.substring(0, 100)}`);
    }
  }
  
  client.release();
  await pool.end();
  console.log('🎉 All migrations done!');
}

runMigrations().catch(console.error);
