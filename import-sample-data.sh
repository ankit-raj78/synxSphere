#!/bin/bash
# Import SyncSphere sample data script

echo "🚀 Importing SyncSphere sample data..."

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) not found. Please install PostgreSQL."
    exit 1
fi

# Database connection parameters
DB_NAME=${DB_NAME:-"syncsphere"}
DB_USER=${DB_USER:-"postgres"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}

echo "📊 Database: $DB_NAME"
echo "👤 User: $DB_USER"
echo "🏠 Host: $DB_HOST"
echo "🔌 Port: $DB_PORT"

# Function to execute SQL file
execute_sql_file() {
    local file=$1
    local description=$2
    
    echo "⚡ $description..."
    
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$file"; then
        echo "✅ $description completed successfully"
    else
        echo "❌ Error executing $description"
        return 1
    fi
}

# Create database if it doesn't exist
echo "🏗️  Ensuring database exists..."
PGPASSWORD=$DB_PASSWORD createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null || echo "Database already exists or error creating database"

# Execute initialization scripts in order
echo "📋 Executing database setup scripts..."

# Execute main PostgreSQL initialization
if [ -f "database/postgresql-init.sql" ]; then
    execute_sql_file "database/postgresql-init.sql" "Setting up main database schema"
else
    echo "⚠️  postgresql-init.sql not found, skipping..."
fi

# Execute audio tables
if [ -f "audio-tables.sql" ]; then
    execute_sql_file "audio-tables.sql" "Setting up audio tables"
else
    echo "⚠️  audio-tables.sql not found, skipping..."
fi

# Execute compositions table
if [ -f "database/add-compositions-table.sql" ]; then
    execute_sql_file "database/add-compositions-table.sql" "Adding compositions table"
else
    echo "⚠️  add-compositions-table.sql not found, skipping..."
fi

# Execute join requests table
if [ -f "database/add-join-requests-table.sql" ]; then
    execute_sql_file "database/add-join-requests-table.sql" "Adding join requests table"
else
    echo "⚠️  add-join-requests-table.sql not found, skipping..."
fi

# Execute sample data
if [ -f "database/syncsphere.sql" ]; then
    execute_sql_file "database/syncsphere.sql" "Importing SyncSphere sample data"
else
    echo "❌ syncsphere.sql not found!"
    exit 1
fi

echo ""
echo "🎉 SyncSphere database setup completed!"
echo ""
echo "📈 Sample data includes:"
echo "   👥 5 sample users (john.doe, jane.smith, mike.wilson, sarah.johnson, alex.brown)"
echo "   🏠 5 collaboration rooms (Rock, Jazz, Electronic, Acoustic, Hip Hop)"
echo "   🎵 5 audio files with different instruments"
echo "   🤝 Multiple room participants and collaborations"
echo "   📨 Sample join requests"
echo "   🎼 3 sample compositions/mixes"
echo ""
echo "🔐 Default password for all sample users: 'password123'"
echo "📧 You can login with any of the sample email addresses"
echo ""
echo "Next steps:"
echo "1. Start your application: npm run dev"
echo "2. Login with a sample account"
echo "3. Explore the collaboration rooms"
echo "4. Test audio upload and mixing features"
