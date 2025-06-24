#!/bin/bash

# Database schema import script
set -e

echo "Connecting to database and importing schema..."

# Import main schema
echo "Importing main database schema..."
PGPASSWORD=SyncSphere2024 psql -h syncsphere-db.cihsiys48bkn.us-east-1.rds.amazonaws.com -U syncsphere_admin -d syncsphere -f /app/database/postgresql-init.sql

# Import additional audio tables
echo "Importing audio tables..."
PGPASSWORD=SyncSphere2024 psql -h syncsphere-db.cihsiys48bkn.us-east-1.rds.amazonaws.com -U syncsphere_admin -d syncsphere -f /app/audio-tables.sql

# Import compositions table
echo "Importing compositions table..."
PGPASSWORD=SyncSphere2024 psql -h syncsphere-db.cihsiys48bkn.us-east-1.rds.amazonaws.com -U syncsphere_admin -d syncsphere -f /app/database/add-compositions-table.sql

# Import join requests table
echo "Importing join requests table..."
PGPASSWORD=SyncSphere2024 psql -h syncsphere-db.cihsiys48bkn.us-east-1.rds.amazonaws.com -U syncsphere_admin -d syncsphere -f /app/database/add-join-requests-table.sql

# Import sample data
echo "Importing sample data..."
PGPASSWORD=SyncSphere2024 psql -h syncsphere-db.cihsiys48bkn.us-east-1.rds.amazonaws.com -U syncsphere_admin -d syncsphere -f /app/database/syncsphere.sql

echo "Database schema import completed successfully!"

# List tables to verify
echo "Verifying tables..."
PGPASSWORD=SyncSphere2024 psql -h syncsphere-db.cihsiys48bkn.us-east-1.rds.amazonaws.com -U syncsphere_admin -d syncsphere -c "\dt"
