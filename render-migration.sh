#!/bin/bash

# This script runs after the database is provisioned on Render
# It applies the multi-tenant authentication schema

echo "🔄 Running database migration..."

# Run the migration script
node backend/migrate.js

echo "✅ Migration complete!"
