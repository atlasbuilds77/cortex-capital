import { query } from '../lib/db';

async function setupBrokerTable() {
  try {
    // Create broker_credentials table
    await query(`
      CREATE TABLE IF NOT EXISTS broker_credentials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        broker_type VARCHAR(50) NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        account_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, broker_type)
      );
    `);
    console.log('✅ broker_credentials table created/verified');

    // Check if table exists and show structure
    const result = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'broker_credentials'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Table structure:');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ Error setting up table:', error);
    throw error;
  }
}

setupBrokerTable().then(() => process.exit(0)).catch(() => process.exit(1));
