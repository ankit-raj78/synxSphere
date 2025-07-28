import WebSocket, { WebSocketServer } from 'ws'
import { createCollabMessage, CollabMessage, CollabMessageType } from './MessageTypes'
import { DatabaseService } from '../database/DatabaseService'

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
    this.wss = new WebSocketServer({ port })
    
    console.log(`WebSocket server started on port ${port}`)
    
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
    console.log(`[WSServer] Received message: ${message.type} from user ${message.userId}`)

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
      case 'DRAG_TRACK':
      case 'UPDATE_TRACK':
      case 'SAMPLE_SYNC':
      case 'PROJECT_SAVED':
      case 'PROJECT_LOADED':
      case 'REGION_CREATED':
      case 'REGION_DELETED':
      case 'REGION_MOVED':
      case 'REGION_RESIZED':
      case 'CLIP_CREATED':
      case 'CLIP_DELETED':
      case 'CLIP_MOVED':
      case 'CLIP_RESIZED':
      case 'TIMELINE_UPDATE':
        // Persist event
        try { await this.db.saveEvent(message) } catch {}
        await this.broadcastToProject(message)
        break
      
      case 'SYNC_REQUEST':
        await this.handleSyncRequest(ws, message)
        break
      
      case 'TIMELINE_SNAPSHOT_REQUEST':
        // 转发快照请求给房间内的第一个其他用户
        const projectClients = Array.from(this.clients.values()).filter(
          client => client.projectId === message.projectId && 
                    client.userId !== message.userId
        )
        
        if (projectClients.length > 0) {
          // 选择第一个其他用户来提供快照
          const provider = projectClients[0]
          console.log(`[WSServer] Forwarding snapshot request from ${message.userId} to ${provider.userId}`)
          
          // 转发原始消息，只在data中添加originalRequesterId
          this.sendToClient(provider.ws, {
            ...message, // 保持原始消息结构
            data: {
              ...message.data,
              originalRequesterId: message.userId // 原始请求者ID
            }
          })
        } else {
          // 如果没有其他用户，发送空快照
          console.log('[WSServer] No other users to provide snapshot, sending empty response')
          this.sendToClient(ws, {
            type: 'TIMELINE_SNAPSHOT_RESPONSE',
            projectId: message.projectId,
            userId: 'server',
            timestamp: Date.now(),
            data: {
              updates: [], // 使用新格式
              boxCount: 0
            }
          })
        }
        break
      
      case 'TIMELINE_SNAPSHOT_RESPONSE':
        // 将快照响应转发给原始请求者
        // 快照响应应该包含原始请求者的ID
        const targetUserId = message.data.requesterId || message.userId
        const requesterClients = Array.from(this.clients.values()).filter(
          client => client.projectId === message.projectId && 
                    client.userId === targetUserId
        )
        
        if (requesterClients.length > 0) {
          console.log(`[WSServer] Forwarding snapshot response to original requester ${targetUserId}`)
          requesterClients.forEach(client => {
            this.sendToClient(client.ws, message)
          })
        } else {
          console.log(`[WSServer] Could not find original snapshot requester ${targetUserId}`)
        }
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
    console.log(`🔥 Total clients for project: ${Array.from(this.clients.values()).filter(c => c.projectId === message.projectId).length}`)
    
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
      
      // Get historical events for this project
      const events = await this.db.getEvents(projectId)
      
      console.log(`📊 Active users for project ${projectId}:`, activeUsers)
      console.log(`📊 Sending sync response to user ${userId} with ${events?.length || 0} events`)
      
      const syncResponse = createCollabMessage.syncResponse(projectId, userId, {
        ownership,
        locks: {}, // TODO: implement locks
        activeUsers,
        events // Include historical events
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
