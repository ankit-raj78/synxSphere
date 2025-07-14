#!/bin/bash

# OpenDAW Collaboration MVP Setup Script

set -e

echo "🚀 Setting up OpenDAW Collaboration MVP..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists docker; then
    echo "❌ Docker is required but not installed. Please install Docker first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is required but not installed. Please install Node.js and npm first."
    exit 1
fi

echo "✅ Prerequisites satisfied"

# Stop any existing containers
echo "🧹 Cleaning up existing containers..."
docker-compose down 2>/dev/null || true

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start database
echo "🗄️ Starting PostgreSQL database..."
docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Check if database is accessible
echo "🔍 Testing database connection..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if docker exec opendaw_collab_db pg_isready -U opendaw >/dev/null 2>&1; then
        echo "✅ Database is ready"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ Database failed to start after $max_attempts attempts"
        echo "💡 Try running: docker-compose logs postgres"
        exit 1
    fi
    
    echo "⏳ Attempt $attempt/$max_attempts - waiting for database..."
    sleep 2
    ((attempt++))
done

# Show database info
echo "📊 Database Information:"
echo "  Host: localhost"
echo "  Port: 5433"
echo "  Database: opendaw_collab"
echo "  User: opendaw"
echo "  Password: collaboration"

# Start the collaboration server
echo "🌐 Starting collaboration server..."
echo "  WebSocket: ws://localhost:3001"
echo "  API: http://localhost:3002"

echo ""
echo "🎯 Setup complete! You can now:"
echo "  1. Start the server: npm run server"
echo "  2. Open OpenDAW with collaboration:"
echo "     http://localhost:5173?projectId=test&userId=user1&collaborative=true"
echo ""
echo "📖 For more details, see README.md"
