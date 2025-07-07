#!/bin/bash

# OpenDAW Server Management Script
# This script helps manage the OpenDAW development server

OPENDAW_DIR="$(dirname "$0")/../openDAW"
PID_FILE="/tmp/opendaw-server.pid"
LOG_FILE="/tmp/opendaw-server.log"

function start_server() {
    echo "Starting OpenDAW server..."
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo "OpenDAW server is already running (PID: $PID)"
            return 0
        else
            rm -f "$PID_FILE"
        fi
    fi
    
    cd "$OPENDAW_DIR/studio"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    # Start the server in the background
    npm run dev > "$LOG_FILE" 2>&1 &
    SERVER_PID=$!
    
    echo $SERVER_PID > "$PID_FILE"
    echo "OpenDAW server started (PID: $SERVER_PID)"
    echo "Logs available at: $LOG_FILE"
    echo "Server should be available at: https://localhost:8080"
    
    # Wait a moment for server to start
    sleep 3
    
    # Check if server is responding
    if curl -k -s https://localhost:8080 > /dev/null; then
        echo "✅ OpenDAW server is responding"
    else
        echo "⚠️  Server may still be starting up. Check logs if issues persist."
    fi
}

function stop_server() {
    echo "Stopping OpenDAW server..."
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            kill $PID
            echo "OpenDAW server stopped (PID: $PID)"
            rm -f "$PID_FILE"
        else
            echo "OpenDAW server was not running"
            rm -f "$PID_FILE"
        fi
    else
        echo "No PID file found. Attempting to find and kill any running processes..."
        pkill -f "vite.*openDAW" || echo "No running OpenDAW processes found"
    fi
}

function status_server() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo "✅ OpenDAW server is running (PID: $PID)"
            
            # Check if server is responding
            if curl -k -s https://localhost:8080 > /dev/null; then
                echo "✅ Server is responding at https://localhost:8080"
            else
                echo "⚠️  Server process exists but not responding"
            fi
        else
            echo "❌ OpenDAW server is not running (stale PID file)"
            rm -f "$PID_FILE"
        fi
    else
        echo "❌ OpenDAW server is not running"
    fi
}

function restart_server() {
    stop_server
    sleep 2
    start_server
}

function show_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo "=== OpenDAW Server Logs ==="
        tail -f "$LOG_FILE"
    else
        echo "No log file found at $LOG_FILE"
    fi
}

function setup_environment() {
    echo "Setting up OpenDAW environment..."
    
    cd "$OPENDAW_DIR"
    
    # Install dependencies for main openDAW
    echo "Installing main dependencies..."
    npm install
    
    # Install dependencies for studio
    echo "Installing studio dependencies..."
    cd studio
    npm install
    
    # Build the worklet if the script exists
    if npm run | grep -q "build:worklet"; then
        echo "Building OpenDAW worklet..."
        npm run build:worklet
    else
        echo "Skipping worklet build (script not found)"
    fi
    
    echo "✅ Environment setup complete"
}

case "$1" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        status_server
        ;;
    logs)
        show_logs
        ;;
    setup)
        setup_environment
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|setup}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the OpenDAW development server"
        echo "  stop    - Stop the OpenDAW development server"
        echo "  restart - Restart the OpenDAW development server"
        echo "  status  - Check if the server is running"
        echo "  logs    - Show server logs (tail -f)"
        echo "  setup   - Set up the OpenDAW environment"
        exit 1
        ;;
esac
