#!/bin/bash

# OpenDAW Development Setup Script
echo "🚀 Starting OpenDAW Collaboration System (Development Mode)"
echo "==========================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down

# Start the development environment
echo "🔨 Starting development services..."
docker-compose -f docker-compose.dev.yml --env-file .env.docker.dev up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "📊 Service Status:"
echo "=================="
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "🌐 Development URLs:"
echo "==================="
echo "📱 SynxSphere Dashboard: http://localhost:8000"
echo "🎵 OpenDAW Studio:       https://localhost:8080"
echo "🔧 Adminer (DB Tool):    http://localhost:8081"
echo "📊 Collaboration API:    http://localhost:3004"
echo "🔌 WebSocket Server:     ws://localhost:3005"
echo ""
echo "💾 Database Access:"
echo "=================="
echo "Host: localhost"
echo "Port: 5434"
echo "Database: opendaw_collab"
echo "Username: opendaw"
echo "Password: collaboration"
echo ""
echo "✅ Development environment is ready!"
echo "📋 Check logs with: docker-compose -f docker-compose.dev.yml logs -f"
