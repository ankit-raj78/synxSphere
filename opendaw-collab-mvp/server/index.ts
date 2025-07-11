import dotenv from 'dotenv'
import { WSServer } from '../src/websocket/WSServer'
import { DatabaseService } from '../src/database/DatabaseService'

// Load environment variables
dotenv.config()

const WS_PORT = parseInt(process.env.WS_PORT || '3001')
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/opendaw_collab'

async function startServer() {
  try {
    console.log('Starting OpenDAW Collaboration Server...')
    
    // Initialize database connection
    console.log('Connecting to database...')
    const db = new DatabaseService(DATABASE_URL)
    
    // Test database connection
    const isConnected = await db.ping()
    if (!isConnected) {
      throw new Error('Failed to connect to database')
    }
    console.log('Database connected successfully')
    
    // Clean up any expired locks on startup
    const cleanedLocks = await db.cleanupExpiredLocks()
    console.log(`Cleaned up ${cleanedLocks} expired locks`)
    
    // Start WebSocket server
    console.log(`Starting WebSocket server on port ${WS_PORT}...`)
    const wsServer = new WSServer(WS_PORT, db)
    
    console.log('✅ OpenDAW Collaboration Server is running!')
    console.log(`   WebSocket: ws://localhost:${WS_PORT}`)
    console.log(`   Database: ${DATABASE_URL}`)
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down server...')
      
      wsServer.close()
      await db.close()
      
      console.log('✅ Server shutdown complete')
      process.exit(0)
    })
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down...')
      
      wsServer.close()
      await db.close()
      
      process.exit(0)
    })
    
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
startServer()
