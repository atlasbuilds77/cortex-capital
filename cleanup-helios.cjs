const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const cortexTables = [
  'portfolio_templates',
  'stock_analysis_cache', 
  'preference_change_log',
  'onboarding_progress',
  'user_exclusions',
  'user_custom_stocks',
  'user_preferences',
  'reports',
  'analysis_results',
  'options_chain_cache',
  'risk_profile_configs',
  'weekly_rotation',
  'day_trades',
  'options_positions',
  'greeks_history',
  'execution_history',
  'email_history',
  'email_preferences',
  'market_data_cache',
  'brokerage_connections',
  'portfolio_snapshots',
  'rebalancing_plans',
  'users'
];

async function cleanup() {
  const client = await pool.connect();
  
  for (const table of cortexTables) {
    try {
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`✅ Dropped ${table}`);
    } catch (e) {
      console.log(`⚠️ ${table}: ${e.message.substring(0,50)}`);
    }
  }
  
  try {
    await client.query(`DROP FUNCTION IF EXISTS update_updated_at_column CASCADE`);
    console.log('✅ Dropped update_updated_at_column function');
  } catch (e) {}
  
  client.release();
  await pool.end();
  console.log('\n🧹 Helios database cleaned!');
}

cleanup();
