# Simple Railway Deployment for SyncSphere
# Railway offers free PostgreSQL database and app hosting
# Version: 1.0.1

param(
    [string]$ProjectName = "syncsphere"
)

Write-Host "🚀 Starting SyncSphere Railway Deployment..." -ForegroundColor Green

# Check if Railway CLI is installed
Write-Host "Checking Railway CLI..." -ForegroundColor Yellow

$railwayInstalled = $false
try {
    railway --help | Out-Null
    $railwayInstalled = $true
} catch {
    $railwayInstalled = $false
}

if (-not $railwayInstalled) {
    Write-Host "Installing Railway CLI..." -ForegroundColor Yellow
    
    # Install using npm
    npm install -g @railway/cli
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Railway CLI" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Railway CLI installed" -ForegroundColor Green
} else {
    Write-Host "✅ Railway CLI is ready" -ForegroundColor Green
}

# Create railway.json configuration
$railwayConfig = @{
    deploy = @{
        startCommand = "npm start"
        healthcheckPath = "/api/health"
        healthcheckTimeout = 100
    }
} | ConvertTo-Json -Depth 10

$railwayConfig | Out-File -FilePath "railway.json" -Encoding UTF8
Write-Host "✅ Created railway.json configuration" -ForegroundColor Green

# Create Dockerfile optimized for Railway
@"
# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose port (Railway will set PORT environment variable)
EXPOSE `${PORT:-3000}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js || exit 1

# Start the application
CMD ["npm", "start"]
"@ | Out-File -FilePath "Dockerfile.railway" -Encoding UTF8

Write-Host "✅ Created Railway-optimized Dockerfile" -ForegroundColor Green

# Create .railwayignore file
@"
node_modules
.next
.git
*.log
.env.local
.env.development
.env.test
README*.md
docs/
tests/
"@ | Out-File -FilePath ".railwayignore" -Encoding UTF8

Write-Host "✅ Created .railwayignore file" -ForegroundColor Green

# Login to Railway if not already logged in
$loginOutput = railway whoami 2>&1
if ($loginOutput -like "*not logged in*") {
    Write-Host "Please login to Railway..." -ForegroundColor Yellow
    railway login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to login to Railway" -ForegroundColor Red
        exit 1
    }
}

# Create or link to project
Write-Host "Creating or linking to Railway project..." -ForegroundColor Yellow

$linkOutput = railway link 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating new Railway project..." -ForegroundColor Yellow
    railway init
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create Railway project" -ForegroundColor Red
        exit 1
    }
}

# Add PostgreSQL database
Write-Host "Adding PostgreSQL database..." -ForegroundColor Yellow
$services = railway status 2>&1
if ($services -notmatch "postgresql") {
    Write-Host "Creating PostgreSQL database..." -ForegroundColor Yellow
    railway add
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to add PostgreSQL database" -ForegroundColor Red
        exit 1
    }
}

# Set environment variables
Write-Host "Setting environment variables..." -ForegroundColor Yellow
railway variables set NODE_ENV=production PORT=3000

# Deploy the application
Write-Host "Deploying application..." -ForegroundColor Yellow
railway up

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}

# Create domain
$domainOutput = railway domain 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating domain..." -ForegroundColor Yellow
    railway domain
}

Write-Host ""
Write-Host "🎉 Railway deployment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open your application: railway open" -ForegroundColor White
Write-Host "2. View logs: railway logs" -ForegroundColor White
Write-Host "3. Connect to database: railway connect" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Railway automatically provides:" -ForegroundColor Green
Write-Host "   - Free PostgreSQL database" -ForegroundColor White
Write-Host "   - Automatic HTTPS" -ForegroundColor White
Write-Host "   - Environment variables" -ForegroundColor White
Write-Host "   - No AWS permissions needed!" -ForegroundColor White
