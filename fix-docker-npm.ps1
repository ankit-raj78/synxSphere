# Fix npm installation issues in Docker containers

Write-Host "Fixing npm installation issues in Docker..." -ForegroundColor Green

# Clean npm cache in the container
Write-Host "Cleaning npm cache..." -ForegroundColor Yellow
docker run --rm -v "${PWD}:/app" -w /app node:18-alpine sh -c "npm cache clean --force"

# Remove problematic packages
Write-Host "Removing problematic files..." -ForegroundColor Yellow
docker run --rm -v "${PWD}:/app" -w /app node:18-alpine sh -c "rm -rf node_modules/.audiobuffer* node_modules/audiobuffer package-lock.json"

# Create .npmrc to handle file locking issues
Write-Host "Creating .npmrc configuration..." -ForegroundColor Yellow
@"
fund=false
audit=false
loglevel=error
force=true
fetch-retries=10
fetch-retry-mintimeout=20000
fetch-retry-maxtimeout=120000
"@ | Out-File -FilePath ".npmrc" -Encoding UTF8

Write-Host "Fix completed!" -ForegroundColor Green
Write-Host "You can now run: docker-compose -f docker-compose.dev.yml up -d" -ForegroundColor Cyan 