# Database Migration Script

This script applies the full multi-tenant authentication schema to your PostgreSQL database.

## Prerequisites

- PostgreSQL installed
- Database connection URL (from Render or local)
- psql command-line tool

## Instructions

### Option 1: Using psql directly

```bash
# Set your database URL
export DATABASE_URL="your-postgres-connection-string"

# Run the migration
psql $DATABASE_URL -f backend/schema.sql
```

### Option 2: Using Node.js script

Create a file `backend/migrate.js`:

```javascript
import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Reading schema file...');
    const schema = fs.readFileSync('./backend/schema.sql', 'utf8');
    
    console.log('Executing migration...');
    await pool.query(schema);
    
    console.log('✓ Migration completed successfully!');
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
```

Then run:

```bash
node backend/migrate.js
```

## Rollback (if needed)

To rollback, drop all created tables:

```sql
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
DROP VIEW IF EXISTS active_users;
DROP VIEW IF EXISTS user_report_counts;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS user_has_permission(INTEGER, VARCHAR);
```

## After Migration

1. **Create your first organization and admin user** by registering through the UI
2. **Set JWT_SECRET environment variable** in your `.env` file:
   ```
   JWT_SECRET=your-secure-random-secret-key-here
   ```
3. **Set FRONTEND_URL** for CORS:
   ```
   FRONTEND_URL=http://localhost:5173
   ```
4. Restart your backend server

## Verification

Check that tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- organizations
- users
- sessions
- reports
- audit_log
- invitations
- permissions
- role_permissions
- api_keys
- notification_preferences
