import { query } from '../lib/db';

async function runMigration() {
  try {
    console.log('Running Stripe columns migration...');
    
    // Add Stripe-related columns
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)`);
    console.log('✓ Added stripe_customer_id column');
    
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)`);
    console.log('✓ Added stripe_subscription_id column');
    
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'none'`);
    console.log('✓ Added subscription_status column');
    
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'free'`);
    console.log('✓ Added tier column');
    
    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id)`);
    console.log('✓ Created stripe_customer_id index');
    
    await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    console.log('✓ Created email index');
    
    await query(`CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier)`);
    console.log('✓ Created tier index');
    
    console.log('\n✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
