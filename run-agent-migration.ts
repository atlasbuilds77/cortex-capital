#!/usr/bin/env tsx
/**
 * Agent System Migration Runner
 * Executes migration 011_agent_system.sql
 * 
 * Usage: tsx run-agent-migration.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getPool } from './lib/db';

async function runMigration() {
  console.log('🔄 Starting agent system migration...\n');

  const pool = getPool();
  const client = await pool.connect();

  try {
    // Read migration file
    const migrationPath = join(__dirname, 'migrations', '011_agent_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded:', migrationPath);
    console.log('📊 Executing SQL...\n');

    // Execute migration in a transaction
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');

    console.log('✅ Migration completed successfully!\n');
    console.log('Tables created:');
    console.log('  - agent_relationships');
    console.log('  - agent_relationship_shifts');
    console.log('  - agent_memories');
    console.log('  - user_universes');
    console.log('  - phone_booth_sessions');
    console.log('\n📊 Indexes and triggers created.');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n🎉 All done! Agent system ready for data.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration error:', error);
    process.exit(1);
  });
