#!/bin/bash
# Fix npm installation issues in Docker containers

echo "Fixing npm installation issues in Docker..."

# Clean npm cache in the container
echo "Cleaning npm cache..."
docker run --rm -v $(pwd):/app -w /app node:18-alpine sh -c "npm cache clean --force"

# Remove problematic packages
echo "Removing problematic files..."
docker run --rm -v $(pwd):/app -w /app node:18-alpine sh -c "rm -rf node_modules/.audiobuffer* node_modules/audiobuffer"

# Create .npmrc to handle file locking issues
echo "Creating .npmrc configuration..."
cat > .npmrc << EOF
fund=false
audit=false
loglevel=error
force=true
EOF

echo "Fix completed. You can now run: docker-compose -f docker-compose.dev.yml up -d" 