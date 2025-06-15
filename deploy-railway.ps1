# Simple Railway Deployment for SyncSphere
# Railway offers free PostgreSQL database and app hosting

param(
    [string]$ProjectName = "syncsphere"
)

Write-Host "🚀 Starting SyncSphere Railway Deployment..." -ForegroundColor Green

# Check if Railway CLI is installed
Write-Host "Checking Railway CLI..." -ForegroundColor Yellow
railway version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing Railway CLI..." -ForegroundColor Yellow
    
    # Download and install Railway CLI for Windows
    $railwayUrl = "https://github.com/railwayapp/cli/releases/latest/download/railway_windows_amd64.exe"
    $railwayPath = "$env:TEMP\railway.exe"
    
    Write-Host "Downloading Railway CLI..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $railwayUrl -OutFile $railwayPath
    
    # Move to a directory in PATH
    $installDir = "$env:LOCALAPPDATA\Railway"
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
    Move-Item $railwayPath "$installDir\railway.exe" -Force
    
    # Add to PATH for current session
    $env:PATH += ";$installDir"
    
    Write-Host "✅ Railway CLI installed" -ForegroundColor Green
}

Write-Host "✅ Railway CLI is ready" -ForegroundColor Green

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
EXPOSE ${"$"}{PORT:-3000}

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

# Create Railway deployment instructions
@"
# SyncSphere Railway Deployment Instructions

Railway provides free hosting with PostgreSQL database included.

## Prerequisites
1. Create a free account at https://railway.app
2. Install Railway CLI (done automatically by the script)

## Deployment Steps

### 1. Login to Railway
```bash
railway login
```

### 2. Create a new project
```bash
railway new
```
Select "Empty Project" and name it "syncsphere"

### 3. Add PostgreSQL database
```bash
railway add postgresql
```

### 4. Set environment variables
```bash
railway variables set NODE_ENV=production
railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)
railway variables set NEXTAUTH_URL=https://your-app.up.railway.app
```

### 5. Deploy the application
```bash
railway up
```

### 6. Get your app URL
```bash
railway domain
```

### 7. Setup database schema
After deployment, run the database setup:
```bash
railway connect postgresql
```
Then run your SQL schema files.

## Environment Variables (Auto-configured by Railway)
- DATABASE_URL (automatically set by Railway PostgreSQL)
- PORT (automatically set by Railway)
- NODE_ENV=production

## Features
- ✅ Free PostgreSQL database (1GB storage)
- ✅ Free app hosting (500 hours/month)
- ✅ Automatic HTTPS
- ✅ Custom domains
- ✅ Zero configuration database connection
- ✅ Built-in monitoring and logs

## Estimated Monthly Cost: $0
Railway's free tier includes:
- PostgreSQL database (1GB)
- App hosting (500 execution hours)
- 1GB outbound bandwidth

## Post-Deployment Checklist
1. ✅ App deployed and accessible
2. ✅ Database connected automatically
3. ✅ Run database schema setup
4. ✅ Upload sample data
5. ✅ Test all functionality
6. ✅ Configure custom domain (optional)

## Useful Commands
- View logs: `railway logs`
- Connect to database: `railway connect postgresql`
- Check status: `railway status`
- Open in browser: `railway open`

## Troubleshooting
- Check deployment logs: `railway logs`
- Verify environment variables: `railway variables`
- Test database connection: `railway connect postgresql`
"@ | Out-File -FilePath "RAILWAY_DEPLOYMENT.md" -Encoding UTF8

Write-Host "✅ Created deployment instructions" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Railway deployment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: railway login" -ForegroundColor White
Write-Host "2. Run: railway new (create project)" -ForegroundColor White
Write-Host "3. Run: railway add postgresql (add database)" -ForegroundColor White
Write-Host "4. Run: railway up (deploy app)" -ForegroundColor White
Write-Host ""
Write-Host "📖 See RAILWAY_DEPLOYMENT.md for detailed instructions" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔄 Railway automatically provides:" -ForegroundColor Green
Write-Host "   - Free PostgreSQL database" -ForegroundColor White
Write-Host "   - Automatic HTTPS" -ForegroundColor White
Write-Host "   - Environment variables" -ForegroundColor White
Write-Host "   - No AWS permissions needed!" -ForegroundColor White
