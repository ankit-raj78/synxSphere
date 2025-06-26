#!/bin/bash

# SyncSphere AI Service Startup Script
# This script properly sets up the environment and starts the AI service

# Change to the AI service directory
cd "$(dirname "$0")"

# Set up Python path to include venv packages and src directory
export PYTHONPATH="$(pwd)/venv/lib/python3.13/site-packages:$(pwd)/src:$PYTHONPATH"

# Add src to sys.path and start the service
cd src
exec /opt/homebrew/opt/python@3.13/bin/python3.13 main.py
