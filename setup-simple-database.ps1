# Setup database for Simple EC2 deployment
# This script connects to the RDS instance and sets up the database

param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$StackName = "SyncSphereSimpleStack",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipSampleData
)

Write-Host "🗄️  Setting up SyncSphere database..." -ForegroundColor Green

# Function to get database endpoint from CloudFormation
function Get-DatabaseEndpoint {
    try {
        $outputs = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
        $dbEndpoint = ($outputs | Where-Object { $_.OutputKey -eq "DatabaseEndpoint" }).OutputValue
        return $dbEndpoint
    } catch {
        Write-Host "❌ Failed to get database endpoint from CloudFormation" -ForegroundColor Red
        return $null
    }
}

# Function to get database password from Secrets Manager
function Get-DatabasePassword {
    param([string]$dbEndpoint)
    
    try {
        # Find the secret for our database
        $secrets = aws secretsmanager list-secrets --region $Region --output json | ConvertFrom-Json
        $dbSecret = $secrets.SecretList | Where-Object { 
            $_.Name -like "*SyncSphere*" -and $_.Name -like "*Database*" 
        } | Select-Object -First 1
        
        if (-not $dbSecret) {
            Write-Host "❌ Could not find database secret" -ForegroundColor Red
            return $null
        }
        
        $secretValue = aws secretsmanager get-secret-value --secret-id $dbSecret.ARN --region $Region --output json | ConvertFrom-Json
        $secret = $secretValue.SecretString | ConvertFrom-Json
        
        return @{
            Host = $dbEndpoint
            Port = 5432
            Database = "syncsphere"
            Username = $secret.username
            Password = $secret.password
        }
    } catch {
        Write-Host "❌ Failed to retrieve database credentials: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Function to test database connection
function Test-DatabaseConnection {
    param($credentials)
    
    Write-Host "🔍 Testing database connection..." -ForegroundColor Yellow
    
    $env:PGPASSWORD = $credentials.Password
    
    try {
        $testQuery = "SELECT version();"
        $result = psql -h $credentials.Host -p $credentials.Port -U $credentials.Username -d $credentials.Database -c $testQuery 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Database connection successful" -ForegroundColor Green
            return $true
        } else {
            Write-Host "   ❌ Database connection failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "   ❌ Database connection error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to execute SQL file
function Execute-SQL-File {
    param($credentials, $filePath, $description)
    
    Write-Host "⚡ $description..." -ForegroundColor Yellow
    
    if (-not (Test-Path $filePath)) {
        Write-Host "   ⚠️  $filePath not found, skipping..." -ForegroundColor Yellow
        return $true
    }
    
    $env:PGPASSWORD = $credentials.Password
    
    try {
        $result = psql -h $credentials.Host -p $credentials.Port -U $credentials.Username -d $credentials.Database -f $filePath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ $description completed successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "   ❌ Error executing $description" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "   ❌ Exception executing $description: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main execution
try {
    # Check prerequisites
    if (!(Get-Command psql -ErrorAction SilentlyContinue)) {
        Write-Host "❌ PostgreSQL client (psql) not found." -ForegroundColor Red
        Write-Host "   Install PostgreSQL client tools from: https://www.postgresql.org/download/" -ForegroundColor Yellow
        exit 1
    }
    
    if (!(Get-Command aws -ErrorAction SilentlyContinue)) {
        Write-Host "❌ AWS CLI not found. Please install AWS CLI." -ForegroundColor Red
        exit 1
    }
    
    # Get database information
    Write-Host "📋 Getting database information..." -ForegroundColor Cyan
    
    $dbEndpoint = Get-DatabaseEndpoint
    if (-not $dbEndpoint) {
        Write-Host "❌ Could not get database endpoint. Make sure the stack is deployed." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "   🏠 Database Host: $dbEndpoint" -ForegroundColor Cyan
    
    # Get database credentials
    $credentials = Get-DatabasePassword $dbEndpoint
    if (-not $credentials) {
        Write-Host "❌ Could not get database credentials." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "   👤 Database User: $($credentials.Username)" -ForegroundColor Cyan
    Write-Host "   📊 Database Name: $($credentials.Database)" -ForegroundColor Cyan
    
    # Test connection
    if (-not (Test-DatabaseConnection $credentials)) {
        Write-Host "❌ Cannot connect to database. Please check your deployment." -ForegroundColor Red
        exit 1
    }
    
    # Execute database setup scripts
    Write-Host ""
    Write-Host "📋 Setting up database schema..." -ForegroundColor Cyan
    
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
            Description = "Importing sample data"
        }
    }
    
    $allSuccess = $true
    foreach ($script in $scripts) {
        $success = Execute-SQL-File $credentials $script.File $script.Description
        if (-not $success -and $script.File -eq "database\syncsphere.sql") {
            Write-Host "❌ Failed to import sample data!" -ForegroundColor Red
            $allSuccess = $false
            break
        }
        $allSuccess = $allSuccess -and $success
    }
    
    if ($allSuccess) {
        Write-Host ""
        Write-Host "🎉 Database setup completed successfully!" -ForegroundColor Green
        Write-Host ""
        
        if (-not $SkipSampleData) {
            Write-Host "📈 Sample data includes:" -ForegroundColor Cyan
            Write-Host "   👥 5 sample users (john.doe, jane.smith, mike.wilson, sarah.johnson, alex.brown)" -ForegroundColor White
            Write-Host "   🏠 5 collaboration rooms (Rock, Jazz, Electronic, Acoustic, Hip Hop)" -ForegroundColor White
            Write-Host "   🎵 5 audio files with different instruments" -ForegroundColor White
            Write-Host "   🤝 Multiple room participants and collaborations" -ForegroundColor White
            Write-Host "   📨 Sample join requests" -ForegroundColor White
            Write-Host "   🎼 3 sample compositions/mixes" -ForegroundColor White
            Write-Host ""
            Write-Host "🔐 Default password for all sample users: 'password123'" -ForegroundColor Yellow
        }
        
        Write-Host "📚 Next steps:" -ForegroundColor Cyan
        Write-Host "   1. Your EC2 instance should now be able to connect to the database" -ForegroundColor White
        Write-Host "   2. SSH into your EC2 instance and check the application" -ForegroundColor White
        Write-Host "   3. The application should automatically use these database credentials" -ForegroundColor White
        
    } else {
        Write-Host ""
        Write-Host "⚠️  Database setup completed with some issues." -ForegroundColor Yellow
        Write-Host "   Check the errors above and retry if needed." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Database setup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "🛠️  Database Management Commands:" -ForegroundColor Cyan
Write-Host "   Connect to DB: psql -h $($credentials.Host) -U $($credentials.Username) -d $($credentials.Database)" -ForegroundColor White
Write-Host "   Check tables: \dt" -ForegroundColor White
Write-Host "   View users: SELECT email, username FROM users;" -ForegroundColor White
