/**
 * OpenDAW CRDT Operation Log
 * 
 * This system works WITH OpenDAW's existing BoxGraph structure by:
 * 1. Intercepting all BoxGraph operations (create, modify, delete)
 * 2. Converting them to CRDT operations with vector clocks
 * 3. Synchronizing operation logs between users
 * 4. Rebuilding consistent .od files from merged operations
 */

// Simple UUID generator for operations
function generateUUID(): string {
  return 'op-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
}

// Vector Clock for operation ordering
export class VectorClock {
  private clocks: Map<string, number> = new Map()

  constructor(userId?: string) {
    if (userId) {
      this.clocks.set(userId, 0)
    }
  }

  tick(userId: string): VectorClock {
    const current = this.clocks.get(userId) || 0
    const newClock = new VectorClock()
    newClock.clocks = new Map(this.clocks)
    newClock.clocks.set(userId, current + 1)
    return newClock
  }

  compare(other: VectorClock): 'before' | 'after' | 'concurrent' {
    let isLessOrEqual = true
    let isGreaterOrEqual = true

    const allKeys = new Set([...this.clocks.keys(), ...other.clocks.keys()])
    
    for (const key of allKeys) {
      const thisValue = this.clocks.get(key) || 0
      const otherValue = other.clocks.get(key) || 0
      
      if (thisValue > otherValue) {
        isLessOrEqual = false
      }
      if (thisValue < otherValue) {
        isGreaterOrEqual = false
      }
    }

    if (isLessOrEqual && isGreaterOrEqual) {
      return this.equals(other) ? 'before' : 'concurrent'
    }
    if (isLessOrEqual) {
      return 'before'
    }
    if (isGreaterOrEqual) {
      return 'after'
    }
    return 'concurrent'
  }

  equals(other: VectorClock): boolean {
    if (this.clocks.size !== other.clocks.size) return false
    
    for (const [key, value] of this.clocks) {
      if (other.clocks.get(key) !== value) return false
    }
    return true
  }

  merge(other: VectorClock | any): VectorClock {
    // Handle case where 'other' is a plain object (from JSON deserialization)
    let otherClock = other
    if (!(other instanceof VectorClock)) {
      otherClock = VectorClock.fromObject(other)
    }
    
    const merged = new VectorClock()
    const allKeys = new Set([...this.clocks.keys(), ...otherClock.clocks.keys()])
    
    for (const key of allKeys) {
      const thisValue = this.clocks.get(key) || 0
      const otherValue = otherClock.clocks.get(key) || 0
      merged.clocks.set(key, Math.max(thisValue, otherValue))
    }
    
    return merged
  }

  // Reconstruct VectorClock from plain object (for deserialization)
  static fromObject(obj: any): VectorClock {
    const clock = new VectorClock()
    if (obj && obj.clocks) {
      // Handle case where clocks is a Map-like object or array of entries
      if (obj.clocks instanceof Map) {
        clock.clocks = new Map(obj.clocks)
      } else if (Array.isArray(obj.clocks)) {
        clock.clocks = new Map(obj.clocks)
      } else if (typeof obj.clocks === 'object') {
        // Handle plain object with clocks as properties
        for (const [key, value] of Object.entries(obj.clocks)) {
          clock.clocks.set(key, value as number)
        }
      }
    }
    return clock
  }

  toJSON(): any {
    return Object.fromEntries(this.clocks.entries())
  }

  static fromJSON(data: any, userId?: string): VectorClock {
    const clock = new VectorClock(userId)
    clock.clocks = new Map(Object.entries(data).map(([k, v]) => [k, v as number]))
    return clock
  }
}

// OpenDAW Operation Types
export interface OpenDAWOperation {
  id: string                    // Operation UUID
  vectorClock: VectorClock      // Ordering information
  userId: string               
  type: 'box_add' | 'box_remove' | 'box_modify' | 'connection_change'
  target: {
    boxUuid: string            // Which box is affected
    boxType: string            // AudioUnitBox, AudioFileBox, etc.
    fieldPath?: string[]       // e.g., ['volume', 'value']
  }
  data: any                    // The actual change
  dependencies: string[]       // Previous operation IDs this depends on
  timestamp: number            // Wall clock time (for debugging)
}

// CRDT Operation Log
export class OpenDAWOperationLog {
  private operations: Map<string, OpenDAWOperation> = new Map()
  private vectorClock: VectorClock
  private userId: string
  private appliedOperations: Set<string> = new Set()

  constructor(userId: string) {
    this.userId = userId
    this.vectorClock = new VectorClock(userId)
  }

  // Add new operation
  addOperation(
    type: OpenDAWOperation['type'],
    target: OpenDAWOperation['target'],
    data: any,
    dependencies: string[] = []
  ): OpenDAWOperation {
    const operation: OpenDAWOperation = {
      id: generateUUID(),
      vectorClock: this.vectorClock.tick(this.userId),
      userId: this.userId,
      type,
      target,
      data,
      dependencies,
      timestamp: Date.now()
    }

    this.operations.set(operation.id, operation)
    this.vectorClock = operation.vectorClock
    
    console.log(`[OpenDAWCRDT] Added operation:`, {
      id: operation.id,
      type: operation.type,
      target: operation.target,
      userId: operation.userId
    })

    return operation
  }

  // Merge remote operations
  mergeRemoteOperations(remoteOps: any[]): boolean {
    let hasChanges = false

    for (const remoteOpData of remoteOps) {
      // Reconstruct proper operation object from JSON data
      const remoteOp = this.reconstructOperation(remoteOpData)
      
      if (!this.operations.has(remoteOp.id)) {
        this.operations.set(remoteOp.id, remoteOp)
        this.vectorClock = this.vectorClock.merge(remoteOp.vectorClock)
        hasChanges = true
        
        console.log(`[OpenDAWCRDT] Merged remote operation:`, {
          id: remoteOp.id,
          type: remoteOp.type,
          fromUser: remoteOp.userId
        })
      }
    }

    return hasChanges
  }

  // Reconstruct operation from JSON data (for deserialization)
  private reconstructOperation(opData: any): OpenDAWOperation {
    return {
      id: opData.id,
      type: opData.type,
      target: opData.target,
      data: opData.data,
      userId: opData.userId,
      timestamp: opData.timestamp,
      vectorClock: VectorClock.fromObject(opData.vectorClock),
      dependencies: opData.dependencies || []
    }
  }

  // Get operations in dependency order
  getOrderedOperations(): OpenDAWOperation[] {
    const operations = Array.from(this.operations.values())
    
    // Topological sort by dependencies and vector clocks
    const visited = new Set<string>()
    const result: OpenDAWOperation[] = []
    
    const visit = (op: OpenDAWOperation) => {
      if (visited.has(op.id)) return
      
      // Visit dependencies first
      for (const depId of op.dependencies) {
        const dep = this.operations.get(depId)
        if (dep && !visited.has(depId)) {
          visit(dep)
        }
      }
      
      visited.add(op.id)
      result.push(op)
    }

    // Sort by vector clock to handle concurrent operations
    const sortedOps = operations.sort((a, b) => {
      const comparison = a.vectorClock.compare(b.vectorClock)
      if (comparison === 'before') return -1
      if (comparison === 'after') return 1
      // For concurrent operations, use timestamp as tiebreaker
      return a.timestamp - b.timestamp
    })

    for (const op of sortedOps) {
      visit(op)
    }

    return result
  }

  // Get operations not yet applied
  getUnappliedOperations(): OpenDAWOperation[] {
    return this.getOrderedOperations().filter(op => !this.appliedOperations.has(op.id))
  }

  // Mark operation as applied
  markApplied(operationId: string): void {
    this.appliedOperations.add(operationId)
  }

  // Get missing operations (for sync)
  getMissingOperations(remoteOpIds: string[]): string[] {
    return remoteOpIds.filter(id => !this.operations.has(id))
  }

  // Export for sync
  exportOperations(operationIds?: string[]): OpenDAWOperation[] {
    if (operationIds) {
      return operationIds.map(id => this.operations.get(id)).filter(Boolean) as OpenDAWOperation[]
    }
    return Array.from(this.operations.values())
  }

  // Get current state hash
  getStateHash(): string {
    const orderedOps = this.getOrderedOperations()
    const opIds = orderedOps.map(op => op.id).join(',')
    
    // Simple hash function
    let hash = 0
    for (let i = 0; i < opIds.length; i++) {
      const char = opIds.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return hash.toString(16)
  }

  // Get operation IDs for sync
  getOperationIds(): string[] {
    return Array.from(this.operations.keys())
  }

  // Clear operations (for testing)
  clear(): void {
    this.operations.clear()
    this.appliedOperations.clear()
    this.vectorClock = new VectorClock(this.userId)
  }

  // Get statistics
  getStats(): any {
    return {
      totalOperations: this.operations.size,
      appliedOperations: this.appliedOperations.size,
      pendingOperations: this.operations.size - this.appliedOperations.size,
      vectorClock: this.vectorClock.toJSON(),
      lastOperation: Array.from(this.operations.values()).sort((a, b) => b.timestamp - a.timestamp)[0]
    }
  }
}

// BoxGraph Operation Interceptor
export class BoxGraphOperationLogger {
  private operationLog: OpenDAWOperationLog
  private boxGraph: any
  private originalMethods: Map<string, Function> = new Map()

  constructor(userId: string, boxGraph: any) {
    this.operationLog = new OpenDAWOperationLog(userId)
    this.boxGraph = boxGraph
    this.setupInterceptors()
  }

  // Hook into BoxGraph methods
  private setupInterceptors(): void {
    console.log('[BoxGraphLogger] Setting up operation interceptors...')

    // Intercept box creation
    if (this.boxGraph.createBox) {
      this.interceptMethod('createBox', (original, args) => {
        console.log('[BoxGraphLogger] Intercepting createBox:', args)
        
        // Call original method
        const result = original.apply(this.boxGraph, args)
        
        // Log operation
        if (result && result.address) {
          this.operationLog.addOperation(
            'box_add',
            {
              boxUuid: result.address.uuid.getValue(),
              boxType: result.constructor.name
            },
            {
              boxData: this.serializeBox(result),
              createdAt: Date.now()
            }
          )
        }
        
        return result
      })
    }

    // Intercept box removal
    if (this.boxGraph.removeBox || this.boxGraph.deleteBox) {
      const removeMethod = this.boxGraph.removeBox ? 'removeBox' : 'deleteBox'
      this.interceptMethod(removeMethod, (original, args) => {
        console.log(`[BoxGraphLogger] Intercepting ${removeMethod}:`, args)
        
        // Get box info before removal
        const boxUuid = args[0] // Assuming first arg is UUID or box
        const box = typeof boxUuid === 'string' ? this.boxGraph.findBox(boxUuid) : boxUuid
        
        if (box && box.address) {
          this.operationLog.addOperation(
            'box_remove',
            {
              boxUuid: box.address.uuid.getValue(),
              boxType: box.constructor.name
            },
            {
              removedAt: Date.now()
            }
          )
        }
        
        return original.apply(this.boxGraph, args)
      })
    }

    // Intercept field updates (if available)
    this.setupFieldInterceptors()

    console.log('[BoxGraphLogger] ✅ Operation interceptors set up')
  }

  // Intercept field updates on boxes
  private setupFieldInterceptors(): void {
    // This would need to be customized based on OpenDAW's box field system
    // For now, we'll use a generic approach
    
    if (this.boxGraph.subscribeToAllUpdatesImmediate) {
      this.boxGraph.subscribeToAllUpdatesImmediate((update: any) => {
        console.log('[BoxGraphLogger] Field update detected:', update)
        
        if (update.box && update.field) {
          this.operationLog.addOperation(
            'box_modify',
            {
              boxUuid: update.box.address.uuid.getValue(),
              boxType: update.box.constructor.name,
              fieldPath: [update.field.name]
            },
            {
              oldValue: update.oldValue,
              newValue: update.newValue,
              modifiedAt: Date.now()
            }
          )
        }
      })
    }
  }

  // Helper method to intercept any method
  private interceptMethod(methodName: string, interceptor: (original: Function, args: any[]) => any): void {
    const original = this.boxGraph[methodName]
    if (typeof original === 'function') {
      this.originalMethods.set(methodName, original)
      
      this.boxGraph[methodName] = (...args: any[]) => {
        return interceptor(original, args)
      }
      
      console.log(`[BoxGraphLogger] ✅ Intercepted method: ${methodName}`)
    } else {
      console.warn(`[BoxGraphLogger] ⚠️ Method ${methodName} not found or not a function`)
    }
  }

  // Serialize box for operations
  private serializeBox(box: any): any {
    try {
      // This would need to be customized based on OpenDAW's serialization
      return {
        uuid: box.address?.uuid?.getValue(),
        type: box.constructor.name,
        fields: this.extractBoxFields(box),
        connections: this.extractBoxConnections(box)
      }
    } catch (error) {
      console.warn('[BoxGraphLogger] Failed to serialize box:', error)
      return {
        uuid: box.address?.uuid?.getValue(),
        type: box.constructor.name,
        error: (error as Error).message
      }
    }
  }

  // Extract box fields (customize based on OpenDAW's field system)
  private extractBoxFields(box: any): any {
    const fields: any = {}
    
    // Try to extract common fields
    if (box.volume && typeof box.volume.getValue === 'function') {
      fields.volume = box.volume.getValue()
    }
    if (box.pan && typeof box.pan.getValue === 'function') {
      fields.pan = box.pan.getValue()
    }
    if (box.mute && typeof box.mute.getValue === 'function') {
      fields.mute = box.mute.getValue()
    }
    
    return fields
  }

  // Extract box connections
  private extractBoxConnections(box: any): any {
    // This would need to be implemented based on OpenDAW's connection system
    return {}
  }

  // Get the operation log
  getOperationLog(): OpenDAWOperationLog {
    return this.operationLog
  }

  // Restore original methods (for cleanup)
  cleanup(): void {
    for (const [methodName, original] of this.originalMethods) {
      this.boxGraph[methodName] = original
    }
    this.originalMethods.clear()
    console.log('[BoxGraphLogger] 🧹 Cleaned up interceptors')
  }
}
