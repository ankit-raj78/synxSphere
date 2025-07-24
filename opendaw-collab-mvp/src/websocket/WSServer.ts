import WebSocket, { WebSocketServer } from 'ws'
import { createCollabMessage, CollabMessage, CollabMessageType } from './MessageTypes'
import { DatabaseService } from '../database/DatabaseService'
import https from 'https'
import fs from 'fs'
import path from 'path'

interface ConnectedClient {
  ws: WebSocket
  projectId: string
  userId: string
  sessionId: string
  lastSeen: Date
}

export class WSServer {
  private wss: WebSocketServer
  private clients: Map<string, ConnectedClient> = new Map()
  private db: DatabaseService
  private heartbeatInterval: NodeJS.Timeout

  constructor(port: number, db: DatabaseService) {
    this.db = db
    
    // Check if SSL certificates exist for secure WebSocket
    const certPath = path.join(__dirname, '../../../localhost.pem')
    const keyPath = path.join(__dirname, '../../../localhost-key.pem')
    
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      console.log('Using SSL certificates for secure WebSocket (WSS)')
      
      // Create HTTPS server with SSL certificates
      const server = https.createServer({
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
      })
      
      // Create WebSocket server with HTTPS server
      this.wss = new WebSocketServer({ server })
      
      // Listen on the specified port
      server.listen(port, () => {
        console.log(`Secure WebSocket server (WSS) started on port ${port}`)
      })
    } else {
      console.log('SSL certificates not found, using non-secure WebSocket (WS)')
      this.wss = new WebSocketServer({ port })
      console.log(`WebSocket server started on port ${port}`)
    }
    
    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req)
    })

    // Start cleanup interval
    this.heartbeatInterval = setInterval(() => {
      this.cleanupInactiveClients()
      this.db.cleanupExpiredLocks()
    }, 60000) // Every minute
  }

  private handleConnection(ws: WebSocket, req: any): void {
    console.log('New WebSocket connection')
    
    ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message: CollabMessage = JSON.parse(data.toString())
        await this.handleMessage(ws, message)
      } catch (error) {
        console.error('Error handling WebSocket message:', error)
        this.sendError(ws, 'Invalid message format', error)
      }
    })

    ws.on('close', () => {
      this.handleDisconnection(ws)
    })

    ws.on('error', (error) => {
      console.error('WebSocket error:', error)
      this.handleDisconnection(ws)
    })
  }

  private async handleMessage(ws: WebSocket, message: CollabMessage): Promise<void> {
    console.log(`Received message: ${message.type} from ${message.userId}`)

    switch (message.type) {
      case 'USER_JOIN':
        await this.handleUserJoin(ws, message)
        break
      
      case 'USER_LEAVE':
        await this.handleUserLeave(ws, message)
        break
      
      case 'BOX_CREATED':
      case 'BOX_UPDATED':
      case 'BOX_DELETED':
      case 'BOX_OWNERSHIP_CLAIMED':
      case 'BOX_OWNERSHIP_RELEASED':
      case 'BOX_LOCKED':
      case 'BOX_UNLOCKED':
        await this.broadcastToProject(message)
        break
      
      case 'SYNC_REQUEST':
        await this.handleSyncRequest(ws, message)
        break
      
      default:
        console.warn(`Unknown message type: ${message.type}`)
    }
  }

  private async handleUserJoin(ws: WebSocket, message: CollabMessage): Promise<void> {
    const sessionId = this.generateSessionId()
    const client: ConnectedClient = {
      ws,
      projectId: message.projectId,
      userId: message.userId,
      sessionId,
      lastSeen: new Date()
    }

    // Store client
    this.clients.set(sessionId, client)
    
    // Store in database
    await this.db.createUserSession(sessionId, message.projectId, message.userId)
    
    console.log(`🔥 User ${message.userId} joined project ${message.projectId}`)
    console.log(`🔥 Session ID: ${sessionId}`)
    console.log(`🔥 Total clients for project: ${Array.from(this.clients.values()).filter(c => c.projectId === message.projectId).length}`)
    console.log(`🔥 All clients: ${Array.from(this.clients.values()).map(c => `${c.userId}@${c.projectId}`).join(', ')}`)
    
    // Send initial sync data
    await this.sendSyncResponse(ws, message.projectId, message.userId)
    
    // Broadcast user join to other users in the project
    await this.broadcastToProject(message, sessionId)
  }

  private async handleUserLeave(ws: WebSocket, message: CollabMessage): Promise<void> {
    const client = this.findClientByWebSocket(ws)
    if (client) {
      await this.db.removeUserSession(client.sessionId)
      this.clients.delete(client.sessionId)
      
      console.log(`User ${message.userId} left project ${message.projectId}`)
      
      // Broadcast user leave
      await this.broadcastToProject(message)
    }
  }

  private async handleSyncRequest(ws: WebSocket, message: CollabMessage): Promise<void> {
    await this.sendSyncResponse(ws, message.projectId, message.userId)
  }

  private async sendSyncResponse(ws: WebSocket, projectId: string, userId: string): Promise<void> {
    try {
      const ownership = await this.db.getProjectOwnership(projectId)
      // Get active users from in-memory client list instead of database
      const activeUsers = Array.from(this.clients.values())
        .filter(client => client.projectId === projectId)
        .map(client => client.userId)
        .filter((userId, index, arr) => arr.indexOf(userId) === index) // Remove duplicates
      
      console.log(`� �📊 Active users for project ${projectId}:`, activeUsers)
      console.log(`🔥 📊 Sending sync response to user ${userId}`)
      
      const syncResponse = createCollabMessage.syncResponse(projectId, userId, {
        ownership,
        locks: {}, // TODO: implement locks
        activeUsers
      })
      
      this.sendToClient(ws, syncResponse)
    } catch (error) {
      console.error('Error sending sync response:', error)
      this.sendError(ws, 'Failed to sync state', error)
    }
  }

  private async broadcastToProject(message: CollabMessage, excludeSessionId?: string): Promise<void> {
    const projectClients = Array.from(this.clients.values()).filter(
      client => client.projectId === message.projectId && client.sessionId !== excludeSessionId
    )

    console.log(`📡 Broadcasting ${message.type} to project ${message.projectId}`)
    console.log(`📡 Total clients in project: ${Array.from(this.clients.values()).filter(c => c.projectId === message.projectId).length}`)
    console.log(`📡 Clients to broadcast to: ${projectClients.length} (excluding ${excludeSessionId})`)
    console.log(`📡 Client details:`, projectClients.map(c => ({ userId: c.userId, sessionId: c.sessionId })))

    const broadcastPromises = projectClients.map(client => {
      console.log(`📤 Sending ${message.type} to user ${client.userId} (session: ${client.sessionId})`)
      return this.sendToClient(client.ws, message)
    })

    await Promise.allSettled(broadcastPromises)
  }

  private sendToClient(ws: WebSocket, message: CollabMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message), (error) => {
          if (error) {
            console.error('Error sending message:', error)
            reject(error)
          } else {
            resolve()
          }
        })
      } else {
        reject(new Error('WebSocket not open'))
      }
    })
  }

  private sendError(ws: WebSocket, message: string, details?: any): void {
    const errorMessage = {
      type: 'ERROR',
      projectId: '',
      userId: '',
      timestamp: Date.now(),
      data: { message, details }
    }
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(errorMessage))
    }
  }

  private handleDisconnection(ws: WebSocket): void {
    const client = this.findClientByWebSocket(ws)
    if (client) {
      console.log(`Client disconnected: ${client.userId}`)
      
      // Remove from database
      this.db.removeUserSession(client.sessionId).catch(console.error)
      
      // Remove from memory
      this.clients.delete(client.sessionId)
      
      // Broadcast leave message
      const leaveMessage = createCollabMessage.userLeave(
        client.projectId,
        client.userId,
        { reason: 'disconnect' }
      )
      this.broadcastToProject(leaveMessage).catch(console.error)
    }
  }

  private findClientByWebSocket(ws: WebSocket): ConnectedClient | undefined {
    return Array.from(this.clients.values()).find(client => client.ws === ws)
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private cleanupInactiveClients(): void {
    const now = new Date()
    const timeout = 5 * 60 * 1000 // 5 minutes

    for (const [sessionId, client] of this.clients.entries()) {
      if (now.getTime() - client.lastSeen.getTime() > timeout) {
        console.log(`Cleaning up inactive client: ${client.userId}`)
        
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.close()
        }
        
        this.db.removeUserSession(sessionId).catch(console.error)
        this.clients.delete(sessionId)
      }
    }
  }

  getConnectedClients(): Array<{ projectId: string; userId: string; sessionId: string }> {
    return Array.from(this.clients.values()).map(client => ({
      projectId: client.projectId,
      userId: client.userId,
      sessionId: client.sessionId
    }))
  }

  getProjectClients(projectId: string): Array<{ userId: string; sessionId: string }> {
    return Array.from(this.clients.values())
      .filter(client => client.projectId === projectId)
      .map(client => ({
        userId: client.userId,
        sessionId: client.sessionId
      }))
  }

  close(): void {
    clearInterval(this.heartbeatInterval)
    this.wss.close()
  }
}
