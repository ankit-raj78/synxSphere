#!/bin/bash
set -e

# This script creates additional databases during PostgreSQL initialization
# It runs as part of the docker-entrypoint-initdb.d process

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create the default user database if it doesn't exist
    -- This prevents connection errors when no database name is specified
    SELECT 'CREATE DATABASE opendaw OWNER opendaw'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'opendaw')
    \gexec
EOSQL

echo "✅ Additional databases initialized"
