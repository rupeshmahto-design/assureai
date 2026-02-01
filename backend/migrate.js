import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const { Pool } = pg;

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Starting database migration...\n');
    
    // Check if migration is needed
    const schemaCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'organizations'
      )
    `);
    
    if (schemaCheck.rows[0].exists) {
      console.log('⚠️  Migration appears to have already been run.');
      console.log('Organizations table already exists.');
      const proceed = process.argv.includes('--force');
      
      if (!proceed) {
        console.log('\nTo force re-run migration, use: node migrate.js --force');
        console.log('WARNING: This will DROP all tables and recreate them!');
        await pool.end();
        return;
      }
      
      console.log('\n🔥 Force flag detected. Dropping existing tables...');
      
      await pool.query(`
        DROP TABLE IF EXISTS notification_preferences CASCADE;
        DROP TABLE IF EXISTS api_keys CASCADE;
        DROP TABLE IF EXISTS role_permissions CASCADE;
        DROP TABLE IF EXISTS permissions CASCADE;
        DROP TABLE IF EXISTS invitations CASCADE;
        DROP TABLE IF EXISTS audit_log CASCADE;
        DROP TABLE IF EXISTS sessions CASCADE;
        DROP TABLE IF EXISTS reports CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP TABLE IF EXISTS organizations CASCADE;
        DROP VIEW IF EXISTS active_users CASCADE;
        DROP VIEW IF EXISTS user_report_counts CASCADE;
        DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
        DROP FUNCTION IF EXISTS user_has_permission(INTEGER, VARCHAR) CASCADE;
      `);
      
      console.log('✓ Tables dropped successfully\n');
    } else {
      // Check if old reports table exists (from backward compatibility)
      const oldReportsCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'reports'
        )
      `);
      
      if (oldReportsCheck.rows[0].exists) {
        console.log('📦 Found old reports table. Dropping for upgrade...');
        await pool.query('DROP TABLE IF EXISTS reports CASCADE');
      }
    }
    
    console.log('📖 Reading schema file...');
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('⚙️  Executing migration...\n');
    await pool.query(schema);
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📋 Created tables:');
    console.log('   - organizations');
    console.log('   - users');
    console.log('   - sessions');
    console.log('   - reports (updated with multi-tenant fields)');
    console.log('   - audit_log');
    console.log('   - invitations');
    console.log('   - permissions');
    console.log('   - role_permissions');
    console.log('   - api_keys');
    console.log('   - notification_preferences');
    console.log('');
    console.log('📊 Created views:');
    console.log('   - active_users');
    console.log('   - user_report_counts');
    console.log('');
    console.log('🔧 Created functions:');
    console.log('   - update_updated_at_column()');
    console.log('   - user_has_permission()');
    console.log('');
    console.log('⚡ Created triggers:');
    console.log('   - Auto-update timestamps on organizations, users, reports');
    console.log('');
    console.log('✨ Next steps:');
    console.log('   1. Ensure JWT_SECRET is set in .env');
    console.log('   2. Set FRONTEND_URL for CORS configuration');
    console.log('   3. Restart your backend server');
    console.log('   4. Register your first organization via the UI');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\nError details:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration();
