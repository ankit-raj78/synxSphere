#!/bin/bash

# Complete Mixing Workflow Test Setup Script
echo "🚀 Setting up SyncSphere for complete mixing workflow test..."

# Check if required services are running
echo "📋 Checking service status..."

# Function to check if a port is in use
check_port() {
    local port=$1
    local service_name=$2
    
    if lsof -i :$port >/dev/null 2>&1; then
        echo "✅ $service_name (port $port) is running"
        return 0
    else
        echo "❌ $service_name (port $port) is NOT running"
        return 1
    fi
}

# Check all required services
services_ok=true

if ! check_port 3001 "User Service"; then
    services_ok=false
fi

if ! check_port 3002 "Audio Service"; then
    services_ok=false
fi

if ! check_port 3003 "Session Service"; then
    services_ok=false
fi

if ! check_port 3005 "Next.js Frontend"; then
    services_ok=false
fi

# Check database services
if ! check_port 5432 "PostgreSQL"; then
    echo "⚠️  PostgreSQL (port 5432) might not be running"
fi

if ! check_port 27017 "MongoDB"; then
    echo "⚠️  MongoDB (port 27017) might not be running"
fi

if ! check_port 6379 "Redis"; then
    echo "⚠️  Redis (port 6379) might not be running"
fi

# Start services if needed
if [ "$services_ok" = false ]; then
    echo ""
    echo "🔧 Some services are not running. Starting them..."
    
    # Start databases if not running
    if ! check_port 5432 "PostgreSQL"; then
        echo "🗄️  Starting PostgreSQL..."
        brew services start postgresql@14 2>/dev/null || echo "⚠️  Please start PostgreSQL manually"
    fi
    
    if ! check_port 27017 "MongoDB"; then
        echo "🗄️  Starting MongoDB..."
        brew services start mongodb-community 2>/dev/null || echo "⚠️  Please start MongoDB manually"
    fi
    
    if ! check_port 6379 "Redis"; then
        echo "🗄️  Starting Redis..."
        brew services start redis 2>/dev/null || echo "⚠️  Please start Redis manually"
    fi
    
    # Start microservices
    echo "🚀 Starting microservices..."
    
    if ! check_port 3001 "User Service"; then
        echo "👤 Starting User Service..."
        cd services/user-service && npm start > /dev/null 2>&1 &
        sleep 2
    fi
    
    if ! check_port 3002 "Audio Service"; then
        echo "🎵 Starting Audio Service..."
        cd services/audio-service && npm start > /dev/null 2>&1 &
        sleep 2
    fi
    
    if ! check_port 3003 "Session Service"; then
        echo "🔗 Starting Session Service..."
        cd services/session-service && npm start > /dev/null 2>&1 &
        sleep 2
    fi
    
    # Start Next.js frontend if not running on 3005
    if ! check_port 3005 "Next.js Frontend"; then
        echo "🖥️  Starting Next.js Frontend..."
        npm run dev > /dev/null 2>&1 &
        sleep 5
    fi
    
    echo ""
    echo "⏳ Waiting for services to start..."
    sleep 10
fi

# Final status check
echo ""
echo "📊 Final Service Status:"
check_port 3001 "User Service"
check_port 3002 "Audio Service" 
check_port 3003 "Session Service"
check_port 3005 "Next.js Frontend"

# Check if Node.js dependencies are installed
echo ""
echo "📦 Checking dependencies..."

if [ ! -d "node_modules" ]; then
    echo "❌ Node modules not found. Installing..."
    npm install
fi

if command -v node >/dev/null 2>&1; then
    echo "✅ Node.js is installed ($(node --version))"
else
    echo "❌ Node.js is not installed"
    exit 1
fi

# Check if required audio files exist
echo ""
echo "🎵 Checking audio files..."
audio_files=(
    "Arctic Monkeys - Do I Wanna Know？ (Official Video)_vocals.wav"
    "Arctic Monkeys - Do I Wanna Know？ (Official Video)_bass.wav"
    "Arctic Monkeys - Do I Wanna Know？ (Official Video)_drums.wav"
    "Arctic Monkeys - Do I Wanna Know？ (Official Video)_other.wav"
)

for file in "${audio_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ Found: $file"
    else
        echo "⚠️  Not found: $file (will use mock data)"
    fi
done

echo ""
echo "🎉 Setup complete! Ready to run the mixing workflow test."
echo ""
echo "To run the test:"
echo "  node test-complete-mixing-workflow.js"
echo ""
echo "Or to view the web interface:"
echo "  open http://localhost:3005"
echo ""
