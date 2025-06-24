#!/bin/bash

# SyncSphere Database Schema Import Script for ECS Container
# This script imports the complete database schema into PostgreSQL

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting SyncSphere Database Schema Import...${NC}"

# Environment variables (should be set in ECS task definition)
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-syncsphere}
DB_USER=${POSTGRES_USER:-syncsphere_admin}
DB_PASSWORD=${POSTGRES_PASSWORD}

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}Error: POSTGRES_PASSWORD environment variable is not set${NC}"
    exit 1
fi

# Set PGPASSWORD for non-interactive connection
export PGPASSWORD="$DB_PASSWORD"

echo -e "${YELLOW}Database connection details:${NC}"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"

# Test database connection
echo -e "${BLUE}Testing database connection...${NC}"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to database${NC}"
    echo "Please check your database connection settings and ensure the database is accessible"
    exit 1
fi

echo -e "${GREEN}Database connection successful!${NC}"

# Function to execute SQL file
execute_sql_file() {
    local file_path="$1"
    local description="$2"
    
    if [ ! -f "$file_path" ]; then
        echo -e "${YELLOW}Warning: $file_path not found, skipping...${NC}"
        return 0
    fi
    
    echo -e "${BLUE}Executing: $description${NC}"
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file_path"; then
        echo -e "${GREEN}✓ $description completed successfully${NC}"
    else
        echo -e "${RED}✗ Error executing $description${NC}"
        return 1
    fi
}

# Function to execute SQL command
execute_sql_command() {
    local command="$1"
    local description="$2"
    
    echo -e "${BLUE}Executing: $description${NC}"
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$command"; then
        echo -e "${GREEN}✓ $description completed successfully${NC}"
    else
        echo -e "${RED}✗ Error executing $description${NC}"
        return 1
    fi
}

# Import schema files in order
echo -e "${BLUE}Importing database schema...${NC}"

# 1. Create basic tables and structure
execute_sql_file "/app/database/postgresql-init.sql" "Main PostgreSQL schema initialization"

# 2. Add compositions table
execute_sql_file "/app/database/add-compositions-table.sql" "Compositions table"

# 3. Add join requests table  
execute_sql_file "/app/database/add-join-requests-table.sql" "Join requests table"

# 4. Additional audio tables
execute_sql_file "/app/audio-tables.sql" "Additional audio tables"

# 5. Insert sample data (optional, can be skipped in production)
if [ "${SKIP_SAMPLE_DATA:-false}" != "true" ]; then
    echo -e "${BLUE}Importing sample data...${NC}"
    execute_sql_file "/app/database/syncsphere.sql" "Sample data"
else
    echo -e "${YELLOW}Skipping sample data import (SKIP_SAMPLE_DATA=true)${NC}"
fi

# Verify schema import
echo -e "${BLUE}Verifying schema import...${NC}"

# Check if main tables exist
tables_to_check="users rooms room_participants audio_files audio_analysis compositions join_requests"

for table in $tables_to_check; do
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt $table" | grep -q "$table"; then
        echo -e "${GREEN}✓ Table '$table' exists${NC}"
    else
        echo -e "${YELLOW}⚠ Table '$table' not found${NC}"
    fi
done

# Check if UUID extension is installed
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp';" | grep -q "1"; then
    echo -e "${GREEN}✓ UUID extension is installed${NC}"
else
    echo -e "${YELLOW}⚠ UUID extension not found${NC}"
fi

# Show table counts
echo -e "${BLUE}Database summary:${NC}"
for table in $tables_to_check; do
    count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | xargs || echo "0")
    echo "  $table: $count records"
done

echo -e "${GREEN}Database schema import completed successfully!${NC}"
echo -e "${BLUE}Database is ready for SyncSphere application${NC}"

# Clean up
unset PGPASSWORD
