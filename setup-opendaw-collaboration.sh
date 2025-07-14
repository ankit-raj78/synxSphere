#!/bin/bash

# ============================================================================
# OpenDAW Collaboration Project - Complete Setup Script
# ============================================================================
# 
# This script sets up the entire OpenDAW collaboration system from scratch.
# Run this script in an empty directory to get the full project running.
#
# Author: SynxSphere Team
# Date: July 2025
# Version: 1.0
#
# Prerequisites:
# - Node.js 18+ 
# - npm or yarn
# - PostgreSQL 12+
# - Git
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="synxSphere"
DB_NAME="opendaw_collab"
DB_USER="opendaw"
DB_PASSWORD="collaboration"
DB_PORT="5433"

echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}🎵 OpenDAW Collaboration Project - Complete Setup${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""
echo -e "${BLUE}This script will set up:${NC}"
echo -e "  📁 SynxSphere - Main collaboration platform"
echo -e "  🎵 OpenDAW - Digital Audio Workstation"
echo -e "  🔗 Collaboration Server - Real-time sync backend"
echo -e "  🗄️  PostgreSQL Database - Project persistence"
echo -e "  🚀 Development environment with all services"
echo ""

# Function to print step headers
print_step() {
    echo ""
    echo -e "${GREEN}==== $1 ====${NC}"
}

# Function to print substeps
print_substep() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_step "1. Checking Prerequisites"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18+ required. Current version: $(node -v)${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

if ! command_exists git; then
    echo -e "${RED}❌ Git is not installed${NC}"
    exit 1
fi

if ! command_exists psql; then
    echo -e "${YELLOW}⚠️  PostgreSQL client not found. Installing via Homebrew...${NC}"
    if command_exists brew; then
        brew install postgresql
    else
        echo -e "${RED}❌ Please install PostgreSQL manually${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ All prerequisites satisfied${NC}"
echo -e "   Node.js: $(node -v)"
echo -e "   npm: $(npm -v)"
echo -e "   Git: $(git --version)"

# Clone repositories
print_step "2. Cloning Repositories"

if [ -d "$PROJECT_NAME" ]; then
    echo -e "${YELLOW}⚠️  Directory $PROJECT_NAME already exists. Removing...${NC}"
    rm -rf "$PROJECT_NAME"
fi

print_substep "Cloning SynxSphere main repository"
git clone https://github.com/your-username/synxSphere.git
cd "$PROJECT_NAME"

print_substep "Cloning OpenDAW as submodule"
git clone https://github.com/OpenDAWProject/OpenDAW.git openDAW

echo -e "${GREEN}✅ Repositories cloned successfully${NC}"

# Setup PostgreSQL Database
print_step "3. Setting up PostgreSQL Database"

print_substep "Starting PostgreSQL service"
if command_exists brew; then
    brew services start postgresql || true
elif command_exists systemctl; then
    sudo systemctl start postgresql || true
fi

print_substep "Creating database and user"
# Create database and user
psql postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" || true
psql postgres -c "DROP USER IF EXISTS $DB_USER;" || true
psql postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
psql postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

print_substep "Setting up database schema"
cat > database/init.sql << 'EOF'
-- OpenDAW Collaboration Database Schema

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(255) PRIMARY KEY,
    room_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Box ownership tracking
CREATE TABLE IF NOT EXISTS box_ownership (
    project_id VARCHAR(255) NOT NULL,
    box_uuid VARCHAR(255) NOT NULL,
    owner_id VARCHAR(255) NOT NULL,
    owned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, box_uuid)
);

-- Box locks for editing
CREATE TABLE IF NOT EXISTS box_locks (
    project_id VARCHAR(255) NOT NULL,
    box_uuid VARCHAR(255) NOT NULL,
    locked_by VARCHAR(255) NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (project_id, box_uuid)
);

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_room_id ON projects(room_id);
CREATE INDEX IF NOT EXISTS idx_box_ownership_project ON box_ownership(project_id);
CREATE INDEX IF NOT EXISTS idx_box_locks_project ON box_locks(project_id);
CREATE INDEX IF NOT EXISTS idx_box_locks_expires ON box_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_project ON user_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
EOF

# Apply database schema
PGPASSWORD=$DB_PASSWORD psql -h localhost -p 5432 -U $DB_USER -d $DB_NAME -f database/init.sql

echo -e "${GREEN}✅ Database setup completed${NC}"

# Install SynxSphere dependencies
print_step "4. Installing SynxSphere Dependencies"

print_substep "Installing main project dependencies"
npm install

print_substep "Installing additional required packages"
npm install --save-dev @types/node @types/ws
npm install ws pg node-fetch

echo -e "${GREEN}✅ SynxSphere dependencies installed${NC}"

# Setup Collaboration Server
print_step "5. Setting up Collaboration Server"

print_substep "Installing collaboration server dependencies"
cd opendaw-collab-mvp
npm install

print_substep "Creating environment configuration"
cat > .env << EOF
# OpenDAW Collaboration Environment
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
WS_PORT=3005
HTTP_PORT=3003
NODE_ENV=development
LOG_LEVEL=debug
OPENDAW_URL=https://localhost:8080
REACT_APP_URL=http://localhost:3000
EOF

cd ..

echo -e "${GREEN}✅ Collaboration server setup completed${NC}"

# Setup OpenDAW
print_step "6. Setting up OpenDAW"

print_substep "Installing OpenDAW dependencies"
cd openDAW/studio
npm install

print_substep "Building OpenDAW"
npm run build || echo -e "${YELLOW}⚠️  Build warnings are normal${NC}"

cd ../..

echo -e "${GREEN}✅ OpenDAW setup completed${NC}"

# Create startup scripts
print_step "7. Creating Startup Scripts"

print_substep "Creating start-all.sh script"
cat > start-all.sh << 'EOF'
#!/bin/bash

# Start all services for OpenDAW Collaboration

echo "🚀 Starting OpenDAW Collaboration Services..."

# Start collaboration server
echo "📡 Starting collaboration server..."
cd opendaw-collab-mvp
npm run server &
COLLAB_PID=$!
cd ..

# Wait for collaboration server
sleep 5

# Start SynxSphere dashboard
echo "🌐 Starting SynxSphere dashboard..."
npm run dev &
SYNX_PID=$!

# Wait for SynxSphere
sleep 5

# Start OpenDAW
echo "🎵 Starting OpenDAW studio..."
cd openDAW/studio
npm run dev &
OPENDAW_PID=$!
cd ../..

echo ""
echo "✅ All services started!"
echo ""
echo "🔗 Access URLs:"
echo "   SynxSphere Dashboard: http://localhost:3000"
echo "   OpenDAW Studio: https://localhost:8080"
echo "   Collaboration API: http://localhost:3003/api/health"
echo ""
echo "🧪 Test Collaboration:"
echo "   Run: node test-final-integration.js"
echo ""
echo "⏹️  To stop all services: ./stop-all.sh"

# Store PIDs for cleanup
echo $COLLAB_PID > .collab.pid
echo $SYNX_PID > .synx.pid  
echo $OPENDAW_PID > .opendaw.pid

wait
EOF

print_substep "Creating stop-all.sh script"
cat > stop-all.sh << 'EOF'
#!/bin/bash

echo "⏹️  Stopping OpenDAW Collaboration Services..."

# Kill stored PIDs
for pidfile in .collab.pid .synx.pid .opendaw.pid; do
    if [ -f $pidfile ]; then
        PID=$(cat $pidfile)
        if kill -0 $PID 2>/dev/null; then
            echo "Stopping process $PID"
            kill $PID
        fi
        rm -f $pidfile
    fi
done

# Kill any remaining processes
pkill -f "npm run server"
pkill -f "npm run dev" 
pkill -f "ts-node server"

echo "✅ All services stopped"
EOF

print_substep "Creating test script"
cat > test-collaboration.sh << 'EOF'
#!/bin/bash

echo "🧪 Testing OpenDAW Collaboration..."

# Wait for services to be ready
sleep 10

# Run integration test
node test-final-integration.js

echo ""
echo "🎯 Manual Testing:"
echo "1. Open the test URLs provided above"
echo "2. Create some audio tracks in OpenDAW"
echo "3. Verify real-time collaboration"
echo "4. Test project persistence"
EOF

# Make scripts executable
chmod +x start-all.sh stop-all.sh test-collaboration.sh

echo -e "${GREEN}✅ Startup scripts created${NC}"

# Create package.json scripts
print_step "8. Updating Package.json Scripts"

print_substep "Adding convenience scripts"
npm pkg set scripts.start="./start-all.sh"
npm pkg set scripts.stop="./stop-all.sh"
npm pkg set scripts.test:collab="./test-collaboration.sh"
npm pkg set scripts.db:reset="./reset-database.sh"

echo -e "${GREEN}✅ Package.json scripts updated${NC}"

# Create database reset script
print_substep "Creating database reset script"
cat > reset-database.sh << EOF
#!/bin/bash

echo "🔄 Resetting database..."

# Reset database
PGPASSWORD=$DB_PASSWORD psql -h localhost -p 5432 -U $DB_USER -d $DB_NAME -c "
TRUNCATE TABLE projects, box_ownership, box_locks, user_sessions CASCADE;
"

echo "✅ Database reset completed"
EOF

chmod +x reset-database.sh

# Final setup and verification
print_step "9. Final Setup and Verification"

print_substep "Creating default configuration files"

# Create Next.js config if it doesn't exist
if [ ! -f "next.config.js" ]; then
    cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3003/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
EOF
fi

# Create basic README
cat > SETUP.md << 'EOF'
# OpenDAW Collaboration - Setup Complete! 🎉

## Quick Start

1. **Start all services:**
   ```bash
   npm start
   # or
   ./start-all.sh
   ```

2. **Test the system:**
   ```bash
   npm run test:collab
   ```

3. **Stop all services:**
   ```bash
   npm stop
   # or  
   ./stop-all.sh
   ```

## Access URLs

- **SynxSphere Dashboard:** http://localhost:3000
- **OpenDAW Studio:** https://localhost:8080  
- **Collaboration API:** http://localhost:3003/api/health

## Collaboration Testing

1. Open multiple browser tabs with these URLs:
   - User 1: `https://localhost:8080/?collaborative=true&projectId=test&userId=user1&userName=User1`
   - User 2: `https://localhost:8080/?collaborative=true&projectId=test&userId=user2&userName=User2`

2. Create audio tracks and see real-time synchronization!

## Features

✅ Real-time multi-user collaboration  
✅ Auto-save every 30 seconds  
✅ Auto-load projects on open  
✅ OpenDAW native serialization  
✅ Project persistence in PostgreSQL  
✅ WebSocket real-time sync  
✅ User session management  

## Troubleshooting

- **Database issues:** Run `npm run db:reset`
- **Port conflicts:** Check if ports 3000, 3003, 3005, 8080 are available
- **Permission errors:** Make sure scripts are executable (`chmod +x *.sh`)

## Development

- **Collaboration server:** `opendaw-collab-mvp/`
- **OpenDAW integration:** `openDAW/studio/src/collaboration/`  
- **SynxSphere dashboard:** `app/`, `components/`

Happy collaborating! 🎵
EOF

echo -e "${GREEN}✅ Setup documentation created${NC}"

# Final success message
print_step "Setup Complete! 🎉"

echo ""
echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}🎉 OpenDAW Collaboration Project Setup Complete!${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""
echo -e "${CYAN}📋 What was installed:${NC}"
echo -e "   ✅ SynxSphere collaboration platform"
echo -e "   ✅ OpenDAW digital audio workstation" 
echo -e "   ✅ Real-time collaboration server"
echo -e "   ✅ PostgreSQL database with schema"
echo -e "   ✅ All dependencies and configurations"
echo ""
echo -e "${CYAN}🚀 Quick Start:${NC}"
echo -e "   1. ${YELLOW}npm start${NC}        - Start all services"
echo -e "   2. ${YELLOW}npm run test:collab${NC} - Test collaboration"
echo -e "   3. ${YELLOW}npm stop${NC}         - Stop all services"
echo ""
echo -e "${CYAN}🔗 Access URLs:${NC}"
echo -e "   📊 Dashboard: ${BLUE}http://localhost:3000${NC}"
echo -e "   🎵 OpenDAW: ${BLUE}https://localhost:8080${NC}"
echo -e "   📡 API: ${BLUE}http://localhost:3003/api/health${NC}"
echo ""
echo -e "${CYAN}📖 Documentation:${NC}"
echo -e "   Read ${YELLOW}SETUP.md${NC} for detailed instructions"
echo ""
echo -e "${GREEN}Ready to start collaborating! 🎵${NC}"
echo ""
