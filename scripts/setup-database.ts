// Cortex Capital - Database Setup Script
// Creates tables in Supabase

import { supabase } from '../integrations/supabase';
import fs from 'fs';
import path from 'path';

const setupDatabase = async () => {
  console.log('📊 Setting up Cortex Capital database...');

  // Read SQL migration
  const sqlPath = path.join(__dirname, '../migrations/001_initial_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // Execute SQL (Supabase supports raw SQL via RPC or direct connection)
  // For now, we'll create tables manually via Supabase dashboard
  // Or use psql connection string

  console.log('✅ Database schema loaded. Run this SQL in Supabase SQL Editor:');
  console.log('\n' + sql);
};

setupDatabase();
