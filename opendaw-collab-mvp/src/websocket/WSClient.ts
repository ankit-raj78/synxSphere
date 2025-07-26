import { CollabMessage, CollabMessageType } from './MessageTypes'

export class WSClient {
  private ws: WebSocket | null = null
  private url: string
  private projectId: string
  private userId: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private messageHandlers: Map<CollabMessageType, (message: CollabMessage) => void> = new Map()
  // Convenience callbacks
  onDragTrack?: (trackId: string, newIndex: number, fromUser: string) => void
  onUpdateTrack?: (track: any, fromUser: string) => void
  onSyncResponse?: (events?: CollabMessage[]) => void
  onRegionCreated?: (payload: { regionId: string; trackId: string; startTime: number; duration: number; sampleId?: string }, fromUser: string) => void
  onClipCreated?: (payload: { clipId: string; trackId: string; startTime: number; duration: number; sampleId?: string }, fromUser: string) => void
  private isConnecting = false
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor(url: string, projectId: string, userId: string) {
    this.url = url
    this.projectId = projectId
    this.userId = userId
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return
    }

    this.isConnecting = true

    return new Promise((resolve, reject) => {
      try {
        console.log(`Connecting to WebSocket: ${this.url}`)
        this.ws = new WebSocket(this.url)
        
        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.isConnecting = false
          this.reconnectAttempts = 0
          
          // Start heartbeat
          this.startHeartbeat()
          
          // Join the project room
          this.send({
            type: 'USER_JOIN',
            projectId: this.projectId,
            userId: this.userId,
            timestamp: Date.now(),
            data: {}
          })
          
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: CollabMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason)
          this.isConnecting = false
          this.stopHeartbeat()
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.isConnecting = false
          reject(error)
        }

        // Connection timeout
        setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false
            reject(new Error('WebSocket connection timeout'))
          }
        }, 5000)

      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  send(message: CollabMessage): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message))
        return true
      } catch (error) {
        console.error('Error sending WebSocket message:', error)
        return false
      }
    } else {
      console.warn('WebSocket not connected, message not sent:', message.type)
      return false
    }
  }

  onMessage(type: CollabMessageType, handler: (message: CollabMessage) => void): void {
    this.messageHandlers.set(type, handler)
  }

  removeMessageHandler(type: CollabMessageType): void {
    this.messageHandlers.delete(type)
  }

  private handleMessage(message: CollabMessage): void {
    // Don't process our own messages
    if (message.userId === this.userId) {
      return
    }

    // Handle heartbeat responses
    if (message.type === 'SYNC_RESPONSE') {
      // Update our local state with server state
      this.handleSyncResponse(message)
      return
    }

    const handler = this.messageHandlers.get(message.type)
    if (handler) {
      try {
        handler(message)
      } catch (error) {
        console.error(`Error handling message type ${message.type}:`, error)
      }
    } else {
      // Fallback built-in handlers for realtime track events
      switch (message.type) {
        case 'DRAG_TRACK':
          if (this.onDragTrack) {
            const { trackId, newIndex } = message.data as any
            this.onDragTrack(trackId, newIndex, message.userId)
          }
          break
        case 'UPDATE_TRACK':
          if (this.onUpdateTrack) {
            const { track } = message.data as any
            this.onUpdateTrack(track, message.userId)
          }
          break

        case 'REGION_CREATED': {
          const { regionId, trackId, startTime, duration, sampleId } = message.data as any
          console.log('[WSClient] Region created:', { regionId, trackId, startTime, duration, sampleId })
          this.onRegionCreated?.({ regionId, trackId, startTime, duration, sampleId }, message.userId)
          return
        }

        case 'CLIP_CREATED': {
          const { clipId, trackId, startTime, duration, sampleId } = message.data as any
          console.log('[WSClient] Clip created:', { clipId, trackId, startTime, duration, sampleId })
          this.onClipCreated?.({ clipId, trackId, startTime, duration, sampleId }, message.userId)
          return
        }
          
      }
      
      console.log(`No handler for message type: ${message.type}`)
    }
  }

  private handleSyncResponse(message: CollabMessage): void {
    const { events } = message.data as any
    this.onSyncResponse?.(events)
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: 'SYNC_REQUEST',
          projectId: this.projectId,
          userId: this.userId,
          timestamp: Date.now(),
          data: {}
        })
      }
    }, 30000) // Send heartbeat every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * this.reconnectAttempts
    
    console.log(`Reconnecting... attempt ${this.reconnectAttempts} in ${delay}ms`)
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error)
      })
    }, delay)
  }

  disconnect(): void {
    this.stopHeartbeat()
    
    if (this.ws) {
      // Send leave message before disconnecting
      this.send({
        type: 'USER_LEAVE',
        projectId: this.projectId,
        userId: this.userId,
        timestamp: Date.now(),
        data: { reason: 'disconnect' }
      })
      
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  get connectionState(): string {
    if (!this.ws) return 'disconnected'
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting'
      case WebSocket.OPEN: return 'connected'
      case WebSocket.CLOSING: return 'closing'
      case WebSocket.CLOSED: return 'disconnected'
      default: return 'unknown'
    }
  }

  // ---------------------
  // Public helpers
  // ---------------------
  sendDragTrack(trackId: string, newIndex: number): void {
    this.send({
      type: 'DRAG_TRACK',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: { trackId, newIndex }
    } as any)
  }

  sendUpdateTrack(track: any): void {
    this.send({
      type: 'UPDATE_TRACK',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: { track }
    } as any)
  }

  /** Broadcast when a box is created */
  sendBoxCreated(boxUuid: string, boxType: string) {
    this.send({
      type: 'BOX_CREATED',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: { boxUuid, boxType, ownerId: this.userId } as any
    })
  }

  /** Broadcast when a box property is updated */
  sendBoxUpdated(boxUuid: string, field: string, value: any, path?: string) {
    this.send({
      type: 'BOX_UPDATED',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: { boxUuid, field, value, path } as any
    })

  }

  /** Broadcast when a box is deleted */
  sendBoxDeleted(boxUuid: string) {
    this.send({
      type: 'BOX_DELETED',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: { boxUuid } as any
    })
  }

  /** Notify sample library synchronisation (e.g., after mass import) */
  sendSampleSync(sampleCount: number) {
    this.send({
      type: 'SAMPLE_SYNC',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: { sampleCount }
    })
  }

  /** Notify entire project has been saved */
  sendProjectSaved(version: number, projectData: Uint8Array) {
    this.send({
      type: 'PROJECT_SAVED',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: { version, projectData }
    })
  }

  /** Request full sync manually */
  sendSyncRequest(since?: number) {
    this.send({
      type: 'SYNC_REQUEST',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: { since }
    } as any)
  }

  // Timeline-specific helper methods
  sendClipCreated(clipId: string, trackId: string, startTime: number, duration: number, sampleId?: string) {
    this.send({
      type: 'CLIP_CREATED',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: { clipId, trackId, startTime, duration, sampleId }
    })
  }

  sendClipDeleted(clipId: string, trackId: string) {
    this.send({
      type: 'CLIP_DELETED',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: { clipId, trackId }
    })
  }

  sendClipMoved(clipId: string, trackId: string, startTime: number, newTrackId?: string) {
    this.send({
      type: 'CLIP_MOVED',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: { clipId, trackId, newTrackId, startTime }
    })
  }

  sendClipResized(clipId: string, trackId: string, startTime: number, duration: number) {
    this.send({
      type: 'CLIP_RESIZED',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: { clipId, trackId, startTime, duration }
    })
  }

  sendRegionCreated(regionId: string, trackId: string, startTime: number, duration: number, sampleId?: string) {
    this.send({
      type: 'REGION_CREATED',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: { regionId, trackId, startTime, duration, sampleId }
    })
  }

  sendRegionDeleted(regionId: string, trackId: string) {
    this.send({
      type: 'REGION_DELETED',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: { regionId, trackId }
    })
  }

  sendRegionMoved(regionId: string, trackId: string, startTime: number, newTrackId?: string) {
    this.send({
      type: 'REGION_MOVED',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: { regionId, trackId, newTrackId, startTime }
    })
  }

  sendRegionResized(regionId: string, trackId: string, startTime: number, duration: number) {
    this.send({
      type: 'REGION_RESIZED',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: { regionId, trackId, startTime, duration }
    })
  }

  sendTimelineChange(targetId: string, targetType: 'clip' | 'region' | 'track', property: string, value: any, changeType: 'parameter' | 'property' | 'state' = 'property') {
    this.send({
      type: 'TIMELINE_CHANGE',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: { changeType, targetId, targetType, property, value }
    })
  }
}
