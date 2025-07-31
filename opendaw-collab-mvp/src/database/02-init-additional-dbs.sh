#!/bin/bash
set -e

# This script creates additional databases for the PostgreSQL container
# It's executed during database initialization

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create the default user database to prevent connection errors
    -- (When a user connects without specifying a database, PostgreSQL tries to connect to a database with the same name as the user)
    CREATE DATABASE opendaw;
    
    -- Grant permissions to the opendaw user
    GRANT ALL PRIVILEGES ON DATABASE opendaw TO opendaw;
    GRANT ALL PRIVILEGES ON DATABASE opendaw_collab TO opendaw;
    
    -- Create a simple table in the opendaw database to prevent any issues
    \c opendaw;
    CREATE TABLE IF NOT EXISTS info (
        id SERIAL PRIMARY KEY,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    INSERT INTO info (message) VALUES ('Default database for opendaw user - prevents connection errors');
    
    -- Switch to collaboration DB and create collaboration tables
    \c opendaw_collab;
    \i /docker-entrypoint-initdb.d/03-collaboration.sql;
EOSQL

echo "✅ Additional databases and permissions configured"
