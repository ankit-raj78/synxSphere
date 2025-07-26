/**
 * OpenDAW Operation Synchronizer
 * 
 * Handles:
 * 1. Broadcasting operations via WebSocket
 * 2. Receiving remote operations
 * 3. Merging operation logs (CRDT merge)  
 * 4. Optimized sync protocol (hash checking, differential sync)
 */

import { OpenDAWOperationLog, OpenDAWOperation } from './OpenDAWOperationLog'

// WebSocket message types for CRDT operations
export enum CRDTMessageType {
  OPERATION_BATCH = 'crdt_operation_batch',
  SYNC_REQUEST = 'crdt_sync_request',
  SYNC_RESPONSE = 'crdt_sync_response',
  HASH_CHECK = 'crdt_hash_check',
  OPERATION_REQUEST = 'crdt_operation_request'
}

// Message interfaces
export interface CRDTMessage {
  type: CRDTMessageType
  userId: string
  roomId: string
  timestamp: number
  data: any
}

export interface OperationBatchMessage extends CRDTMessage {
  type: CRDTMessageType.OPERATION_BATCH
  data: {
    operations: OpenDAWOperation[]
    sequenceNumber: number
  }
}

export interface SyncRequestMessage extends CRDTMessage {
  type: CRDTMessageType.SYNC_REQUEST
  data: {
    currentHash: string
    operationIds: string[]
  }
}

export interface SyncResponseMessage extends CRDTMessage {
  type: CRDTMessageType.SYNC_RESPONSE
  data: {
    hash: string
    missingOperations: OpenDAWOperation[]
    operationIds: string[]
  }
}

// Operation synchronizer
export class OpenDAWOperationSynchronizer {
  private operationLog: OpenDAWOperationLog
  private websocket: WebSocket | null = null
  private userId: string
  private roomId: string
  private isConnected: boolean = false
  private syncInProgress: boolean = false
  private sequenceNumber: number = 0
  private pendingOperations: OpenDAWOperation[] = []
  private lastSyncHash: string = ''
  private onStateChange?: (hasChanges: boolean) => void

  constructor(
    userId: string, 
    roomId: string, 
    operationLog: OpenDAWOperationLog,
    onStateChange?: (hasChanges: boolean) => void
  ) {
    this.userId = userId
    this.roomId = roomId
    this.operationLog = operationLog
    this.onStateChange = onStateChange
  }

  // Connect to WebSocket
  async connect(websocketUrl: string): Promise<void> {
    try {
      console.log(`[CRDTSync] Connecting to WebSocket: ${websocketUrl}`)
      
      this.websocket = new WebSocket(websocketUrl)
      
      this.websocket.onopen = () => {
        console.log('[CRDTSync] ✅ WebSocket connected')
        this.isConnected = true
        this.requestInitialSync()
      }

      this.websocket.onmessage = (event) => {
        this.handleWebSocketMessage(event)
      }

      this.websocket.onclose = () => {
        console.log('[CRDTSync] 🔌 WebSocket disconnected')
        this.isConnected = false
        this.attemptReconnect()
      }

      this.websocket.onerror = (error) => {
        console.error('[CRDTSync] ❌ WebSocket error:', error)
        this.isConnected = false
      }

    } catch (error) {
      console.error('[CRDTSync] Failed to connect to WebSocket:', error)
      throw error
    }
  }

  // Handle incoming WebSocket messages
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const message: CRDTMessage = JSON.parse(event.data)
      
      // Ignore our own messages
      if (message.userId === this.userId) {
        return
      }

      console.log(`[CRDTSync] Received message:`, {
        type: message.type,
        fromUser: message.userId,
        timestamp: message.timestamp
      })

      switch (message.type) {
        case CRDTMessageType.OPERATION_BATCH:
          this.handleOperationBatch(message as OperationBatchMessage)
          break
          
        case CRDTMessageType.SYNC_REQUEST:
          this.handleSyncRequest(message as SyncRequestMessage)
          break
          
        case CRDTMessageType.SYNC_RESPONSE:
          this.handleSyncResponse(message as SyncResponseMessage)
          break
          
        case CRDTMessageType.HASH_CHECK:
          this.handleHashCheck(message)
          break
          
        case CRDTMessageType.OPERATION_REQUEST:
          this.handleOperationRequest(message)
          break
          
        default:
          console.warn('[CRDTSync] Unknown message type:', message.type)
      }

    } catch (error) {
      console.error('[CRDTSync] Error handling WebSocket message:', error)
    }
  }

  // Handle batch of operations from remote user
  private handleOperationBatch(message: OperationBatchMessage): void {
    console.log(`[CRDTSync] Processing operation batch from ${message.userId}:`, {
      operationCount: message.data.operations.length,
      sequenceNumber: message.data.sequenceNumber
    })

    // Merge remote operations
    const hasChanges = this.operationLog.mergeRemoteOperations(message.data.operations)
    
    if (hasChanges && this.onStateChange) {
      this.onStateChange(true)
    }

    // Send acknowledgment
    this.sendMessage({
      type: CRDTMessageType.HASH_CHECK,
      userId: this.userId,
      roomId: this.roomId,
      timestamp: Date.now(),
      data: {
        hash: this.operationLog.getStateHash(),
        acknowledged: message.data.sequenceNumber
      }
    })
  }

  // Handle sync request from remote user
  private handleSyncRequest(message: SyncRequestMessage): void {
    console.log(`[CRDTSync] Handling sync request from ${message.userId}`)

    const currentHash = this.operationLog.getStateHash()
    const localOpIds = this.operationLog.getOperationIds()
    const remoteOpIds = message.data.operationIds
    
    // Find operations they don't have
    const missingOps = localOpIds.filter(id => !remoteOpIds.includes(id))
    const missingOperations = this.operationLog.exportOperations(missingOps)

    // Send response
    this.sendMessage({
      type: CRDTMessageType.SYNC_RESPONSE,
      userId: this.userId,
      roomId: this.roomId,
      timestamp: Date.now(),
      data: {
        hash: currentHash,
        missingOperations,
        operationIds: localOpIds
      }
    } as SyncResponseMessage)
  }

  // Handle sync response
  private handleSyncResponse(message: SyncResponseMessage): void {
    console.log(`[CRDTSync] Processing sync response from ${message.userId}:`, {
      missingOperations: message.data.missingOperations.length,
      remoteHash: message.data.hash
    })

    // Merge missing operations
    if (message.data.missingOperations.length > 0) {
      const hasChanges = this.operationLog.mergeRemoteOperations(message.data.missingOperations)
      
      if (hasChanges && this.onStateChange) {
        this.onStateChange(true)
      }
    }

    this.syncInProgress = false
    this.lastSyncHash = this.operationLog.getStateHash()
  }

  // Handle hash check
  private handleHashCheck(message: CRDTMessage): void {
    const currentHash = this.operationLog.getStateHash()
    
    if (message.data.hash !== currentHash) {
      console.log('[CRDTSync] Hash mismatch detected, requesting sync')
      this.requestSync()
    }
  }

  // Handle operation request
  private handleOperationRequest(message: CRDTMessage): void {
    const requestedIds = message.data.operationIds
    const operations = this.operationLog.exportOperations(requestedIds)
    
    this.sendMessage({
      type: CRDTMessageType.OPERATION_BATCH,
      userId: this.userId,
      roomId: this.roomId,
      timestamp: Date.now(),
      data: {
        operations,
        sequenceNumber: ++this.sequenceNumber
      }
    } as OperationBatchMessage)
  }

  // Broadcast operation to other users
  broadcastOperation(operation: OpenDAWOperation): void {
    if (!this.isConnected) {
      this.pendingOperations.push(operation)
      console.log('[CRDTSync] WebSocket not connected, queuing operation')
      return
    }

    this.sendMessage({
      type: CRDTMessageType.OPERATION_BATCH,
      userId: this.userId,
      roomId: this.roomId,
      timestamp: Date.now(),
      data: {
        operations: [operation],
        sequenceNumber: ++this.sequenceNumber
      }
    } as OperationBatchMessage)
  }

  // Broadcast multiple operations
  broadcastOperations(operations: OpenDAWOperation[]): void {
    if (!this.isConnected || operations.length === 0) {
      this.pendingOperations.push(...operations)
      return
    }

    this.sendMessage({
      type: CRDTMessageType.OPERATION_BATCH,
      userId: this.userId,
      roomId: this.roomId,
      timestamp: Date.now(),
      data: {
        operations,
        sequenceNumber: ++this.sequenceNumber
      }
    } as OperationBatchMessage)
  }

  // Request initial sync when connecting
  private requestInitialSync(): void {
    console.log('[CRDTSync] Requesting initial sync')
    
    this.sendMessage({
      type: CRDTMessageType.SYNC_REQUEST,
      userId: this.userId,
      roomId: this.roomId,
      timestamp: Date.now(),
      data: {
        currentHash: this.operationLog.getStateHash(),
        operationIds: this.operationLog.getOperationIds()
      }
    } as SyncRequestMessage)

    // Send any pending operations
    if (this.pendingOperations.length > 0) {
      this.broadcastOperations([...this.pendingOperations])
      this.pendingOperations = []
    }
  }

  // Request sync (when hash mismatch detected)
  private requestSync(): void {
    if (this.syncInProgress) {
      return
    }

    this.syncInProgress = true
    console.log('[CRDTSync] Requesting sync due to hash mismatch')

    this.sendMessage({
      type: CRDTMessageType.SYNC_REQUEST,
      userId: this.userId,
      roomId: this.roomId,
      timestamp: Date.now(),
      data: {
        currentHash: this.operationLog.getStateHash(),
        operationIds: this.operationLog.getOperationIds()
      }
    } as SyncRequestMessage)
  }

  // Send message via WebSocket
  private sendMessage(message: CRDTMessage): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.warn('[CRDTSync] Cannot send message - WebSocket not open')
      return
    }

    try {
      this.websocket.send(JSON.stringify(message))
      console.log(`[CRDTSync] Sent message:`, {
        type: message.type,
        timestamp: message.timestamp
      })
    } catch (error) {
      console.error('[CRDTSync] Error sending message:', error)
    }
  }

  // Periodic sync check
  startPeriodicSync(intervalMs: number = 30000): void {
    setInterval(() => {
      if (this.isConnected && !this.syncInProgress) {
        const currentHash = this.operationLog.getStateHash()
        
        if (currentHash !== this.lastSyncHash) {
          console.log('[CRDTSync] Periodic hash check - changes detected')
          
          // Send hash check to all users
          this.sendMessage({
            type: CRDTMessageType.HASH_CHECK,
            userId: this.userId,
            roomId: this.roomId,
            timestamp: Date.now(),
            data: {
              hash: currentHash
            }
          })
        }
      }
    }, intervalMs)
  }

  // Attempt reconnection
  private attemptReconnect(): void {
    console.log('[CRDTSync] Attempting to reconnect in 5 seconds...')
    
    setTimeout(() => {
      if (!this.isConnected && this.websocket) {
        // Reconnect logic would go here
        console.log('[CRDTSync] Reconnection attempt (implement WebSocket URL retrieval)')
      }
    }, 5000)
  }

  // Get sync statistics
  getSyncStats(): any {
    return {
      isConnected: this.isConnected,
      syncInProgress: this.syncInProgress,
      sequenceNumber: this.sequenceNumber,
      pendingOperations: this.pendingOperations.length,
      lastSyncHash: this.lastSyncHash,
      currentHash: this.operationLog.getStateHash(),
      operationLogStats: this.operationLog.getStats()
    }
  }

  // Disconnect
  disconnect(): void {
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }
    this.isConnected = false
    console.log('[CRDTSync] 🔌 Disconnected')
  }
}
