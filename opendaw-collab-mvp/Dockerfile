# Dockerfile for Collaboration Server (opendaw-collab-mvp)
FROM node:18-alpine

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY server/ ./server/

# Create logs directory
RUN mkdir -p logs

# Build TypeScript
RUN npm run build || npx tsc

# Expose ports
EXPOSE 3003 3004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3003/api/health || exit 1

# Start the server
CMD ["node", "dist/server/index.js"]
