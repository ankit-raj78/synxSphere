#!/bin/bash

echo "🧹 Starting comprehensive microservices cleanup..."

# Navigate to services directory
cd /Users/ankitraj2/Documents/GitHub/synxSphere/services

echo "1. Removing entire recommendation-service (excluded/placeholder)..."
rm -rf recommendation-service/

echo "2. Removing all compiled JS outputs (dist folders)..."
rm -rf */dist/

echo "3. Removing all log files..."
rm -rf */logs/
rm -f */*.log

echo "4. Removing node_modules and package-lock files (will be regenerated)..."
rm -rf */node_modules/
rm -f */package-lock.json

echo "5. Checking for additional compiled outputs in shared..."
cd shared
if [ -d "dist" ]; then
    rm -rf dist/
fi

# Check for any JS files that might be compiled outputs
find . -name "*.js" -not -path "./node_modules/*" -exec rm {} \;
find . -name "*.js.map" -not -path "./node_modules/*" -exec rm {} \;
find . -name "*.d.ts" -not -path "./node_modules/*" -exec rm {} \;

cd ..

echo "6. Checking for mock/test files across services..."
find . -name "*mock*" -type f -exec rm {} \;
find . -name "*test*" -type f -not -name "*.config.js" -exec rm {} \;
find . -name "*.spec.*" -exec rm {} \;

echo "7. Removing temporary and setup files..."
find . -name "setup.ts" -exec rm {} \;
find . -name ".tmp" -exec rm {} \;
find . -name "*.tmp" -exec rm {} \;

echo "8. Cleaning up any empty directories..."
find . -type d -empty -delete

echo "✅ Microservices cleanup completed!"
echo ""
echo "📁 Remaining services structure:"
ls -la
echo ""
echo "📋 Summary of cleaned services:"
for service in */; do
    if [ -d "$service" ]; then
        echo "  📦 $service"
        ls -la "$service" | grep -v node_modules
    fi
done
