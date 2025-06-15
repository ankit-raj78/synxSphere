# Simple Vercel Deployment for SyncSphere
# This requires no AWS permissions and uses Vercel's free tier

param(
    [string]$ProjectName = "syncsphere"
)

Write-Host "🚀 Starting SyncSphere Vercel Deployment..." -ForegroundColor Green

# Check if Vercel CLI is installed
Write-Host "Checking Vercel CLI..." -ForegroundColor Yellow
vercel --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Vercel CLI" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Vercel CLI is ready" -ForegroundColor Green

# Create vercel.json configuration
$vercelConfig = @{
    version = 2
    builds = @(
        @{
            src = "package.json"
            use = "@vercel/next"
        }
    )
    env = @{
        NODE_ENV = "production"
        NEXTAUTH_SECRET = "your-nextauth-secret-here"
        NEXTAUTH_URL = "https://your-app.vercel.app"
    }
    functions = @{
        "pages/api/**/*.js" = @{
            maxDuration = 30
        }
    }
} | ConvertTo-Json -Depth 10

$vercelConfig | Out-File -FilePath "vercel.json" -Encoding UTF8
Write-Host "✅ Created vercel.json configuration" -ForegroundColor Green

# Create environment variables file for Vercel
@"
# Vercel Environment Variables
# Add these in your Vercel dashboard under Settings > Environment Variables

NODE_ENV=production
NEXTAUTH_SECRET=your-secret-key-change-this
NEXTAUTH_URL=https://your-app.vercel.app

# Database (use a free PostgreSQL service like Supabase or Neon)
# DATABASE_URL=postgresql://username:password@hostname:port/database
# DB_HOST=your-db-host
# DB_PORT=5432
# DB_NAME=syncsphere
# DB_USER=your-username
# DB_PASSWORD=your-password

# For audio storage, you can use Vercel's built-in file handling
# or integrate with a free service like Cloudinary
"@ | Out-File -FilePath ".env.vercel" -Encoding UTF8

Write-Host "✅ Created .env.vercel template" -ForegroundColor Green

# Create a simplified package.json for Vercel deployment
$packageJson = Get-Content "package.json" | ConvertFrom-Json

# Add Vercel-specific scripts
$packageJson.scripts.build = "next build"
$packageJson.scripts.start = "next start"

# Ensure required dependencies
if (-not $packageJson.dependencies."@vercel/postgres") {
    $packageJson.dependencies | Add-Member -MemberType NoteProperty -Name "@vercel/postgres" -Value "^0.5.0"
}

$packageJson | ConvertTo-Json -Depth 10 | Out-File -FilePath "package.vercel.json" -Encoding UTF8

Write-Host "✅ Created Vercel-compatible package.json" -ForegroundColor Green

# Create Vercel deployment instructions
@"
# SyncSphere Vercel Deployment Instructions

## Prerequisites
1. Create a free account at https://vercel.com
2. Install Vercel CLI: npm install -g vercel

## Database Setup (Free Options)
Choose one of these free PostgreSQL services:

### Option 1: Supabase (Recommended)
1. Go to https://supabase.com
2. Create a new project
3. Get your connection string from Settings > Database
4. Run the database migration scripts

### Option 2: Neon
1. Go to https://neon.tech
2. Create a new database
3. Get your connection string
4. Run the database migration scripts

### Option 3: Railway
1. Go to https://railway.app
2. Create a PostgreSQL database
3. Get your connection string

## Deployment Steps

1. Login to Vercel:
   vercel login

2. Deploy the application:
   vercel --prod

3. Set environment variables in Vercel dashboard:
   - Go to your project settings
   - Add environment variables from .env.vercel file
   - Update DATABASE_URL with your database connection string

4. Redeploy after setting environment variables:
   vercel --prod

## Post-Deployment

1. Run database migrations on your chosen database service
2. Upload sample data using the import scripts
3. Test the application functionality
4. Configure custom domain (optional)

## Estimated Monthly Cost: $0
- Vercel: Free tier (100GB bandwidth, unlimited static requests)
- Database: Free tier (most services offer 500MB-1GB free)
- File Storage: Vercel's built-in storage or free Cloudinary tier

## Support
If you encounter issues:
1. Check Vercel deployment logs
2. Verify environment variables are set correctly
3. Ensure database is accessible from Vercel's servers
"@ | Out-File -FilePath "VERCEL_DEPLOYMENT.md" -Encoding UTF8

Write-Host "✅ Created deployment instructions" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Vercel deployment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Set up a free database (Supabase/Neon/Railway)" -ForegroundColor White
Write-Host "2. Run: vercel login" -ForegroundColor White
Write-Host "3. Run: vercel --prod" -ForegroundColor White
Write-Host "4. Configure environment variables in Vercel dashboard" -ForegroundColor White
Write-Host ""
Write-Host "📖 See VERCEL_DEPLOYMENT.md for detailed instructions" -ForegroundColor Yellow
