# SyncSphere AWS Database Setup Script
# This script sets up the RDS PostgreSQL database with schema and sample data

param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipSampleData
)

Write-Host "🗄️ Setting up SyncSphere database on AWS..." -ForegroundColor Green

# Function to get database connection details from AWS Secrets Manager
function Get-Database-Credentials {
    Write-Host "🔐 Retrieving database credentials..." -ForegroundColor Yellow
    
    # Get database secret ARN from CloudFormation outputs
    $secretArn = aws cloudformation describe-stacks --stack-name SyncSphereStack --query "Stacks[0].Outputs[?OutputKey=='DatabaseSecretArn'].OutputValue" --output text --region $Region 2>$null
    
    if (-not $secretArn) {
        # Alternative: find secret by name pattern
        $secretName = aws secretsmanager list-secrets --query "SecretList[?contains(Name, 'SyncSphere') && contains(Name, 'DBCredentials')].Name | [0]" --output text --region $Region
        
        if (-not $secretName) {
            Write-Host "❌ Database credentials not found. Please deploy infrastructure first." -ForegroundColor Red
            exit 1
        }
        
        $secretArn = $secretName
    }
    
    # Get secret value
    $secretJson = aws secretsmanager get-secret-value --secret-id $secretArn --query SecretString --output text --region $Region
    $secret = $secretJson | ConvertFrom-Json
    
    return @{
        Host = $secret.host
        Port = $secret.port
        Database = $secret.dbname
        Username = $secret.username
        Password = $secret.password
    }
}

# Function to test database connection
function Test-Database-Connection {
    param($credentials)
    
    Write-Host "🔍 Testing database connection..." -ForegroundColor Yellow
    
    # Create temporary psql command
    $env:PGPASSWORD = $credentials.Password
    
    $testQuery = "SELECT version();"
    $result = psql -h $credentials.Host -p $credentials.Port -U $credentials.Username -d $credentials.Database -c $testQuery 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database connection successful" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Database connection failed" -ForegroundColor Red
        return $false
    }
}

# Function to execute SQL file
function Execute-SQL-File {
    param($credentials, $filePath, $description)
    
    Write-Host "⚡ $description..." -ForegroundColor Yellow
    
    if (-not (Test-Path $filePath)) {
        Write-Host "⚠️ $filePath not found, skipping..." -ForegroundColor Yellow
        return $true
    }
    
    $env:PGPASSWORD = $credentials.Password
    
    $result = psql -h $credentials.Host -p $credentials.Port -U $credentials.Username -d $credentials.Database -f $filePath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $description completed successfully" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Error executing $description" -ForegroundColor Red
        return $false
    }
}

# Main execution
try {
    # Check prerequisites
    if (!(Get-Command psql -ErrorAction SilentlyContinue)) {
        Write-Host "❌ PostgreSQL client (psql) not found. Please install PostgreSQL client tools." -ForegroundColor Red
        Write-Host "You can install it from: https://www.postgresql.org/download/" -ForegroundColor Yellow
        exit 1
    }
    
    if (!(Get-Command aws -ErrorAction SilentlyContinue)) {
        Write-Host "❌ AWS CLI not found. Please install AWS CLI." -ForegroundColor Red
        exit 1
    }
    
    # Get database credentials
    $credentials = Get-Database-Credentials
    Write-Host "📊 Database: $($credentials.Database)" -ForegroundColor Cyan
    Write-Host "🏠 Host: $($credentials.Host)" -ForegroundColor Cyan
    Write-Host "🔌 Port: $($credentials.Port)" -ForegroundColor Cyan
    
    # Test connection
    if (-not (Test-Database-Connection $credentials)) {
        Write-Host "❌ Cannot connect to database. Please check your infrastructure deployment." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "📋 Executing database setup scripts..." -ForegroundColor Cyan
    
    # Execute initialization scripts in order
    $scripts = @(
        @{
            File = "database\postgresql-init.sql"
            Description = "Setting up main database schema"
        },
        @{
            File = "audio-tables.sql"
            Description = "Setting up audio tables"
        },
        @{
            File = "database\add-compositions-table.sql"
            Description = "Adding compositions table"
        },
        @{
            File = "database\add-join-requests-table.sql"
            Description = "Adding join requests table"
        }
    )
    
    if (-not $SkipSampleData) {
        $scripts += @{
            File = "database\syncsphere.sql"
            Description = "Importing SyncSphere sample data"
        }
    }
    
    foreach ($script in $scripts) {
        $success = Execute-SQL-File $credentials $script.File $script.Description
        if (-not $success -and $script.File -eq "database\syncsphere.sql") {
            Write-Host "❌ Failed to import sample data!" -ForegroundColor Red
            exit 1
        }
    }
    
    Write-Host ""
    Write-Host "🎉 SyncSphere database setup completed!" -ForegroundColor Green
    Write-Host ""
    
    if (-not $SkipSampleData) {
        Write-Host "📈 Sample data includes:" -ForegroundColor Cyan
        Write-Host "   👥 5 sample users (john.doe, jane.smith, mike.wilson, sarah.johnson, alex.brown)"
        Write-Host "   🏠 5 collaboration rooms (Rock, Jazz, Electronic, Acoustic, Hip Hop)"
        Write-Host "   🎵 5 audio files with different instruments"
        Write-Host "   🤝 Multiple room participants and collaborations"
        Write-Host "   📨 Sample join requests"
        Write-Host "   🎼 3 sample compositions/mixes"
        Write-Host ""
        Write-Host "🔐 Default password for all sample users: 'password123'" -ForegroundColor Yellow
    }
    
    Write-Host "Database connection details stored in AWS Secrets Manager" -ForegroundColor Green
    Write-Host "Application will automatically use these credentials" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Database setup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
