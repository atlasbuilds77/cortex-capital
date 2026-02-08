const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:k0Yb2ESDIksIKTS2@db.lbwbgbujgribraeluzuv.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ops_trigger_rules'
      ORDER BY ordinal_position
    `);
    
    console.log('ops_trigger_rules columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } finally {
    client.release();
    await pool.end();
  }
}

main();
