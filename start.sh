#!/bin/bash

# SynxSphere - Easy Startup Script
# This script provides an interactive way to start all services

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                          🎵 SynxSphere Startup                              ║"
    echo "║                    AI-Powered Music Collaboration Platform                   ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

check_prerequisites() {
    echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        echo "Please install Node.js from https://nodejs.org/"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ Not in SynxSphere project directory${NC}"
        echo "Please run this script from the SynxSphere project root"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
    echo ""
}

check_first_time_setup() {
    echo -e "${YELLOW}🔍 Checking if first-time setup is needed...${NC}"
    
    local needs_setup=false
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  Main dependencies not installed${NC}"
        needs_setup=true
    fi
    
    # Check if openDAW dependencies are installed
    if [ ! -d "openDAW/studio/node_modules" ]; then
        echo -e "${YELLOW}⚠️  OpenDAW dependencies not installed${NC}"
        needs_setup=true
    fi
    
    # Check if SSL certificates exist
    if [ ! -f "openDAW/cert.pem" ] || [ ! -f "openDAW/key.pem" ]; then
        echo -e "${YELLOW}⚠️  SSL certificates not found${NC}"
        needs_setup=true
    fi
    
    if [ "$needs_setup" = true ]; then
        echo ""
        echo -e "${BLUE}🛠️  First-time setup required!${NC}"
        echo -e "${YELLOW}This will:${NC}"
        echo "  • Install npm dependencies"
        echo "  • Install OpenDAW dependencies"
        echo "  • Generate SSL certificates"
        echo ""
        read -p "Proceed with setup? (y/N): " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            run_first_time_setup
        else
            echo -e "${YELLOW}⚠️  Setup cancelled. Some services may not work properly.${NC}"
            echo ""
        fi
    else
        echo -e "${GREEN}✅ Setup is complete${NC}"
        echo ""
    fi
}

run_first_time_setup() {
    echo -e "${BLUE}🛠️  Running first-time setup...${NC}"
    echo ""
    
    # Install main dependencies
    echo -e "${YELLOW}📦 Installing main dependencies...${NC}"
    npm install
    echo ""
    
    # Install OpenDAW dependencies
    echo -e "${YELLOW}📦 Installing OpenDAW dependencies...${NC}"
    cd openDAW/studio
    npm install
    cd ../..
    echo ""
    
    # Generate SSL certificates
    echo -e "${YELLOW}🔐 Generating SSL certificates...${NC}"
    cd openDAW
    bash cert.sh
    cd ..
    echo ""
    
    echo -e "${GREEN}✅ First-time setup completed!${NC}"
    echo ""
}

show_startup_options() {
    echo -e "${BLUE}🚀 Choose how to start SynxSphere:${NC}"
    echo ""
    echo "1) 🚀 Quick Start - Start all services automatically"
    echo "2) 📋 Manual Start - Step-by-step service startup"
    echo "3) 🔍 Check Status - See what's currently running"
    echo "4) ❓ Help - Show detailed instructions"
    echo "5) 🚪 Exit"
    echo ""
}

quick_start() {
    echo -e "${BLUE}🚀 Starting all services...${NC}"
    echo ""
    
    # Start services
    echo -e "${YELLOW}Starting OpenDAW server...${NC}"
    npm run opendaw:start
    sleep 2
    
    echo -e "${YELLOW}Starting React/Next.js app...${NC}"
    npm run dev &
    
    # Wait a moment for services to start
    echo -e "${YELLOW}Waiting for services to initialize...${NC}"
    sleep 5
    
    # Check status
    echo ""
    npm run services:status
    
    echo ""
    echo -e "${GREEN}🎉 Services started! You can now access:${NC}"
    echo -e "${CYAN}   🎵 SynxSphere App: http://localhost:3000${NC}"
    echo -e "${CYAN}   🎧 Studio Integration: http://localhost:3000/studio/opendaw${NC}"
    echo -e "${CYAN}   🎹 Direct OpenDAW: https://localhost:8080${NC}"
    echo ""
    echo -e "${YELLOW}💡 Press Ctrl+C to stop the React app when you're done${NC}"
}

manual_start() {
    echo -e "${BLUE}📋 Manual service startup:${NC}"
    echo ""
    
    echo -e "${YELLOW}Step 1: Start OpenDAW Server${NC}"
    echo "Run in Terminal 1:"
    echo -e "${CYAN}  npm run opendaw:start${NC}"
    echo ""
    
    echo -e "${YELLOW}Step 2: Start React App${NC}"
    echo "Run in Terminal 2:"
    echo -e "${CYAN}  npm run dev${NC}"
    echo ""
    
    echo -e "${YELLOW}Step 3: Access Services${NC}"
    echo -e "${CYAN}  🎵 Main App: http://localhost:3000${NC}"
    echo -e "${CYAN}  🎧 Studio: http://localhost:3000/studio/opendaw${NC}"
    echo -e "${CYAN}  🎹 OpenDAW: https://localhost:8080${NC}"
    echo ""
    
    read -p "Press Enter to continue..."
}

check_status() {
    echo -e "${BLUE}🔍 Checking service status...${NC}"
    echo ""
    npm run services:status
    echo ""
    read -p "Press Enter to continue..."
}

show_help() {
    echo -e "${BLUE}❓ SynxSphere Help${NC}"
    echo ""
    echo -e "${YELLOW}Available npm scripts:${NC}"
    echo "  npm run dev               - Start React/Next.js app"
    echo "  npm run opendaw:start     - Start OpenDAW server"
    echo "  npm run opendaw:stop      - Stop OpenDAW server"
    echo "  npm run services:status   - Check all service status"
    echo "  npm run services:start    - Start all services"
    echo "  npm run services:stop     - Stop all services"
    echo ""
    echo -e "${YELLOW}Documentation:${NC}"
    echo "  docs/QUICK_START_GUIDE.md - Quick start guide"
    echo "  docs/SERVICES_SETUP_GUIDE.md - Detailed setup guide"
    echo "  README.md - Main documentation"
    echo ""
    read -p "Press Enter to continue..."
}

main_menu() {
    while true; do
        show_startup_options
        read -p "Select an option (1-5): " choice
        echo ""
        
        case $choice in
            1)
                quick_start
                break
                ;;
            2)
                manual_start
                ;;
            3)
                check_status
                ;;
            4)
                show_help
                ;;
            5)
                echo -e "${YELLOW}👋 Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Invalid option. Please choose 1-5.${NC}"
                echo ""
                ;;
        esac
    done
}

# Main execution
print_banner
check_prerequisites
check_first_time_setup
main_menu
