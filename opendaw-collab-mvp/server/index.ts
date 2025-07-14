import dotenv from 'dotenv'
import { WSServer } from '../src/websocket/WSServer'
import { DatabaseService } from '../src/database/DatabaseService'
import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'

// Load environment variables
dotenv.config()

const WS_PORT = parseInt(process.env.WS_PORT || '3004')
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3003')
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
    
    // Start Express server for REST API
    const app = express()
    app.use(cors())
    app.use(express.json())
    
    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })
    
    // Serve collaboration CSS
    app.get('/opendaw-collab-styles.css', (req, res) => {
      const cssPath = path.join(__dirname, '../../openDAW/studio/src/assets/collaboration/collaboration.css')
      if (fs.existsSync(cssPath)) {
        res.setHeader('Content-Type', 'text/css')
        res.sendFile(cssPath)
      } else {
        res.status(404).send('CSS file not found')
      }
    })
    
    // Box ownership endpoints  
    app.post('/api/boxes/acquire', async (req, res) => {
      try {
        const { projectId, boxId, userId } = req.body
        await db.setBoxOwner(projectId, boxId, userId)
        res.json({ success: true })
      } catch (error) {
        res.status(500).json({ error: 'Failed to acquire box ownership' })
      }
    })
    
    app.post('/api/boxes/release', async (req, res) => {
      try {
        const { projectId, boxId, userId } = req.body
        // For release, we can check if the user owns it first, then remove
        const currentOwner = await db.getBoxOwner(projectId, boxId)
        if (currentOwner === userId) {
          await db.setBoxOwner(projectId, boxId, '') // Clear ownership
        }
        res.json({ success: true })
      } catch (error) {
        res.status(500).json({ error: 'Failed to release box ownership' })
      }
    })
    
    app.get('/api/boxes/owner/:projectId/:boxId', async (req, res) => {
      try {
        const userId = await db.getBoxOwner(req.params.projectId, req.params.boxId)
        res.json({ userId })
      } catch (error) {
        res.status(500).json({ error: 'Failed to get box ownership' })
      }
    })
    
    app.get('/api/boxes/ownerships/:projectId', async (req, res) => {
      try {
        const ownerships = await db.getProjectOwnership(req.params.projectId)
        res.json(ownerships)
      } catch (error) {
        res.status(500).json({ error: 'Failed to get box ownerships' })
      }
    })

    // Project persistence endpoints
    app.put('/api/projects/:projectId', async (req, res) => {
      try {
        const { projectId } = req.params
        const projectData = req.body
        await db.saveProject(projectId, projectData)
        res.json({ success: true })
      } catch (error) {
        console.error('Failed to save project:', error)
        res.status(500).json({ error: 'Failed to save project' })
      }
    })

    app.get('/api/projects/:projectId', async (req, res) => {
      try {
        const project = await db.loadProject(req.params.projectId)
        if (project) {
          res.json(project)
        } else {
          res.status(404).json({ error: 'Project not found' })
        }
      } catch (error) {
        console.error('Failed to load project:', error)
        res.status(500).json({ error: 'Failed to load project' })
      }
    })
    
    // Start HTTP server
    app.listen(HTTP_PORT, () => {
      console.log(`HTTP API server started on port ${HTTP_PORT}`)
    })
    
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
