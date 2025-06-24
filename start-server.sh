#!/bin/sh

# Startup script for Next.js standalone server with runtime environment variables
# This script ensures environment variables are properly available to the Node.js process

echo "Starting synxSphere with environment variables:"
echo "NODE_ENV: $NODE_ENV"
echo "DATABASE_URL: ${DATABASE_URL:0:20}..." # Only show first 20 chars for security
echo "NEXTAUTH_URL: $NEXTAUTH_URL"

# Export all environment variables to ensure they're available to the Node.js process
export NODE_ENV
export DATABASE_URL
export NEXTAUTH_SECRET
export NEXTAUTH_URL
export POSTGRES_HOST
export POSTGRES_PORT
export POSTGRES_DB
export POSTGRES_USER
export POSTGRES_PASSWORD

# Start the Next.js server
exec node server.js
