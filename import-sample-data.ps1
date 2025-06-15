# Import SyncSphere sample data script for Windows PowerShell

Write-Host "🚀 Importing SyncSphere sample data..." -ForegroundColor Green

# Check if PostgreSQL is available
if (!(Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "❌ PostgreSQL client (psql) not found. Please install PostgreSQL." -ForegroundColor Red
    exit 1
}

# Database connection parameters
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "syncsphere" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_PASSWORD = $env:DB_PASSWORD

Write-Host "📊 Database: $DB_NAME" -ForegroundColor Cyan
Write-Host "👤 User: $DB_USER" -ForegroundColor Cyan
Write-Host "🏠 Host: $DB_HOST" -ForegroundColor Cyan
Write-Host "🔌 Port: $DB_PORT" -ForegroundColor Cyan

# Function to execute SQL file
function Execute-SqlFile {
    param(
        [string]$FilePath,
        [string]$Description
    )
    
    Write-Host "⚡ $Description..." -ForegroundColor Yellow
    
    if (Test-Path $FilePath) {
        $env:PGPASSWORD = $DB_PASSWORD
        $result = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $FilePath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $Description completed successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Error executing $Description" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "⚠️  $FilePath not found, skipping..." -ForegroundColor Yellow
        return $true
    }
}

# Create database if it doesn't exist
Write-Host "🏗️  Ensuring database exists..." -ForegroundColor Yellow
$env:PGPASSWORD = $DB_PASSWORD
& createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Database already exists or error creating database" -ForegroundColor Yellow
}

# Execute initialization scripts in order
Write-Host "📋 Executing database setup scripts..." -ForegroundColor Cyan

# Execute main PostgreSQL initialization
Execute-SqlFile "database\postgresql-init.sql" "Setting up main database schema"

# Execute audio tables
Execute-SqlFile "audio-tables.sql" "Setting up audio tables"

# Execute compositions table
Execute-SqlFile "database\add-compositions-table.sql" "Adding compositions table"

# Execute join requests table
Execute-SqlFile "database\add-join-requests-table.sql" "Adding join requests table"

# Execute sample data
if (!(Execute-SqlFile "database\syncsphere.sql" "Importing SyncSphere sample data")) {
    Write-Host "❌ Failed to import sample data!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 SyncSphere database setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📈 Sample data includes:" -ForegroundColor Cyan
Write-Host "   👥 5 sample users (john.doe, jane.smith, mike.wilson, sarah.johnson, alex.brown)"
Write-Host "   🏠 5 collaboration rooms (Rock, Jazz, Electronic, Acoustic, Hip Hop)"
Write-Host "   🎵 5 audio files with different instruments"
Write-Host "   🤝 Multiple room participants and collaborations"
Write-Host "   📨 Sample join requests"
Write-Host "   🎼 3 sample compositions/mixes"
Write-Host ""
Write-Host "🔐 Default password for all sample users: 'password123'" -ForegroundColor Yellow
Write-Host "📧 You can login with any of the sample email addresses" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "1. Start your application: npm run dev"
Write-Host "2. Login with a sample account"
Write-Host "3. Explore the collaboration rooms"
Write-Host "4. Test audio upload and mixing features"
