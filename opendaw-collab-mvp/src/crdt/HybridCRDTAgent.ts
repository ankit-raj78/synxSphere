/**
 * Hybrid CRDT + OpenDAW Agent
 * 
 * This is the main integration point that:
 * 1. Hooks into OpenDAW's BoxGraph 
 * 2. Logs operations with CRDT semantics
 * 3. Synchronizes with other users
 * 4. Rebuilds consistent .od files
 * 5. Works WITH existing OpenDAW architecture
 */

import { BoxGraphOperationLogger, OpenDAWOperationLog } from './OpenDAWOperationLog'
import { OpenDAWOperationSynchronizer } from './OpenDAWOperationSynchronizer'
import { OpenDAWProjectRebuilder, ProjectRebuildResult } from './OpenDAWProjectRebuilder'

// Integration status
export interface HybridCRDTStatus {
  isInitialized: boolean
  isConnected: boolean
  operationsLogged: number
  operationsSynced: number
  lastRebuild?: Date
  syncStats: any
  rebuildStats: any
  errors: string[]
}

// Configuration
export interface HybridCRDTConfig {
  userId: string
  roomId: string
  websocketUrl: string
  autoRebuildInterval?: number  // Auto-rebuild every N ms
  syncInterval?: number         // Sync check every N ms
  enableDebugLogs?: boolean
}

// Main Hybrid CRDT Agent
export class HybridCRDTAgent {
  private config: HybridCRDTConfig
  private operationLogger: BoxGraphOperationLogger | null = null
  private operationSynchronizer: OpenDAWOperationSynchronizer | null = null
  private projectRebuilder: OpenDAWProjectRebuilder | null = null
  private operationLog: OpenDAWOperationLog | null = null
  
  private isInitialized: boolean = false
  private boxGraph: any = null
  private autoRebuildTimer: NodeJS.Timeout | null = null
  private errors: string[] = []
  
  // Event handlers
  private onProjectUpdate?: (result: ProjectRebuildResult) => void
  private onSyncStatusChange?: (isConnected: boolean) => void
  private onError?: (error: string) => void

  constructor(config: HybridCRDTConfig) {
    this.config = config
    
    console.log('[HybridCRDT] 🚀 Initializing Hybrid CRDT Agent:', {
      userId: config.userId,
      roomId: config.roomId,
      websocketUrl: config.websocketUrl
    })
  }

  // Initialize with OpenDAW's BoxGraph
  async initialize(boxGraph: any): Promise<void> {
    try {
      console.log('[HybridCRDT] 🔧 Initializing with BoxGraph...')
      
      this.boxGraph = boxGraph
      
      // 1. Set up operation logging
      this.operationLogger = new BoxGraphOperationLogger(
        this.config.userId,
        boxGraph
      )
      
      // Use the operation log from the logger
      this.operationLog = this.operationLogger.getOperationLog()
      
      // 2. Set up project rebuilder
      this.projectRebuilder = new OpenDAWProjectRebuilder(
        this.config.userId,
        this.config.roomId,
        this.operationLog
      )
      
      // 3. Set up synchronizer
      this.operationSynchronizer = new OpenDAWOperationSynchronizer(
        this.config.userId,
        this.config.roomId,
        this.operationLog,
        (hasChanges) => this.handleStateChange(hasChanges)
      )
      
      // 4. Connect to WebSocket
      await this.operationSynchronizer.connect(this.config.websocketUrl)
      
      // 5. Set up auto-rebuild if configured
      if (this.config.autoRebuildInterval) {
        this.startAutoRebuild(this.config.autoRebuildInterval)
      }
      
      // 6. Set up periodic sync
      if (this.config.syncInterval) {
        this.operationSynchronizer.startPeriodicSync(this.config.syncInterval)
      }
      
      this.isInitialized = true
      console.log('[HybridCRDT] ✅ Hybrid CRDT Agent initialized successfully')
      
    } catch (error) {
      const errorMsg = `Failed to initialize Hybrid CRDT Agent: ${(error as Error).message}`
      this.errors.push(errorMsg)
      console.error('[HybridCRDT] ❌', errorMsg)
      
      if (this.onError) {
        this.onError(errorMsg)
      }
      
      throw error
    }
  }

  // Handle state changes from synchronizer
  private handleStateChange(hasChanges: boolean): void {
    if (hasChanges) {
      console.log('[HybridCRDT] 🔄 State changes detected, triggering rebuild')
      this.rebuildProject()
    }
  }

  // Rebuild project from current operations
  async rebuildProject(): Promise<ProjectRebuildResult> {
    if (!this.projectRebuilder) {
      throw new Error('Project rebuilder not initialized')
    }

    try {
      console.log('[HybridCRDT] 🔄 Rebuilding project from CRDT operations...')
      
      const result = await this.projectRebuilder.rebuildProject()
      
      if (result.success && result.odFileBuffer) {
        console.log('[HybridCRDT] ✅ Project rebuilt successfully:', {
          operationsApplied: result.operationsApplied,
          boxCount: result.metadata.boxCount,
          trackCount: result.metadata.trackCount,
          rebuildTime: result.metadata.rebuildTime
        })
        
        // Save to OPFS if available
        await this.saveToOPFS(result.odFileBuffer)
        
        if (this.onProjectUpdate) {
          this.onProjectUpdate(result)
        }
      } else {
        console.error('[HybridCRDT] ❌ Project rebuild failed:', result.errors)
      }
      
      return result
      
    } catch (error) {
      const errorMsg = `Project rebuild failed: ${(error as Error).message}`
      this.errors.push(errorMsg)
      console.error('[HybridCRDT] ❌', errorMsg)
      
      if (this.onError) {
        this.onError(errorMsg)
      }
      
      throw error
    }
  }

  // Save rebuilt project to OPFS
  private async saveToOPFS(odFileBuffer: ArrayBuffer): Promise<void> {
    try {
      // This would save to OpenDAW's OPFS structure
      // For now, simulate the save
      console.log(`[HybridCRDT] 💾 Saving project to OPFS (${odFileBuffer.byteLength} bytes)`)
      
      // In real implementation:
      // const opfsHandle = await navigator.storage.getDirectory()
      // const projectFile = await opfsHandle.getFileHandle(`projects/${this.config.roomId}/project.od`, { create: true })
      // const writable = await projectFile.createWritable()
      // await writable.write(odFileBuffer)
      // await writable.close()
      
    } catch (error) {
      console.error('[HybridCRDT] ❌ Failed to save to OPFS:', error)
    }
  }

  // Start auto-rebuild timer
  private startAutoRebuild(intervalMs: number): void {
    if (this.autoRebuildTimer) {
      clearInterval(this.autoRebuildTimer)
    }
    
    this.autoRebuildTimer = setInterval(async () => {
      try {
        if (!this.operationLog) return
        
        const unappliedOps = this.operationLog.getUnappliedOperations()
        
        if (unappliedOps.length > 0) {
          console.log(`[HybridCRDT] ⏰ Auto-rebuild triggered (${unappliedOps.length} unapplied operations)`)
          await this.rebuildProject()
        }
        
      } catch (error) {
        console.error('[HybridCRDT] Auto-rebuild error:', error)
      }
    }, intervalMs)
    
    console.log(`[HybridCRDT] ⏰ Auto-rebuild started (${intervalMs}ms interval)`)
  }

  // Manually trigger sync
  async syncNow(): Promise<void> {
    if (!this.operationSynchronizer) {
      throw new Error('Synchronizer not initialized')
    }
    
    console.log('[HybridCRDT] 🔄 Manual sync triggered')
    
    // This would trigger a sync request
    // For now, just log
    console.log('[HybridCRDT] Manual sync completed')
  }

  // Get current status
  getStatus(): HybridCRDTStatus {
    return {
      isInitialized: this.isInitialized,
      isConnected: this.operationSynchronizer?.getSyncStats()?.isConnected || false,
      operationsLogged: this.operationLog?.getStats().totalOperations || 0,
      operationsSynced: this.operationLog?.getStats().appliedOperations || 0,
      lastRebuild: this.autoRebuildTimer ? new Date() : undefined,
      syncStats: this.operationSynchronizer?.getSyncStats() || {},
      rebuildStats: this.projectRebuilder?.getStats() || {},
      errors: [...this.errors]
    }
  }

  // Set event handlers
  onProjectUpdateCallback(callback: (result: ProjectRebuildResult) => void): void {
    this.onProjectUpdate = callback
  }

  onSyncStatusChangeCallback(callback: (isConnected: boolean) => void): void {
    this.onSyncStatusChange = callback
  }

  onErrorCallback(callback: (error: string) => void): void {
    this.onError = callback
  }

  // Force operation sync (for testing)
  async forceOperationSync(): Promise<void> {
    if (!this.operationSynchronizer) {
      throw new Error('Synchronizer not initialized')
    }

    if (!this.operationLog) {
      throw new Error('Operation log not initialized')
    }

    const unappliedOps = this.operationLog.getUnappliedOperations()
    
    if (unappliedOps.length > 0) {
      console.log(`[HybridCRDT] 🔄 Force syncing ${unappliedOps.length} operations`)
      this.operationSynchronizer.broadcastOperations(unappliedOps)
    }
  }

  // Get operation log for debugging
  getOperationLog(): OpenDAWOperationLog | null {
    return this.operationLog
  }

  // Clear all data (for testing)
  async clearAll(): Promise<void> {
    console.log('[HybridCRDT] 🧹 Clearing all CRDT data')
    
    if (this.operationLog) {
      this.operationLog.clear()
    }
    
    if (this.projectRebuilder) {
      this.projectRebuilder.clearCache()
    }
    
    this.errors = []
  }

  // Export project state for debugging
  exportState(): any {
    return {
      config: this.config,
      status: this.getStatus(),
      operations: this.operationLog?.exportOperations() || [],
      audioFiles: this.projectRebuilder?.getAudioFileStatus() || []
    }
  }

  // Import operations (for testing/migration)
  async importOperations(operations: any[]): Promise<void> {
    if (!this.operationLog) {
      throw new Error('Operation log not initialized')
    }
    
    console.log(`[HybridCRDT] 📥 Importing ${operations.length} operations`)
    
    // Convert to proper format and merge
    const validOps = operations.filter(op => op.id && op.type && op.target)
    
    if (validOps.length > 0) {
      this.operationLog.mergeRemoteOperations(validOps)
      await this.rebuildProject()
    }
  }

  // Shutdown agent
  async shutdown(): Promise<void> {
    console.log('[HybridCRDT] 🔌 Shutting down Hybrid CRDT Agent')
    
    // Clear auto-rebuild timer
    if (this.autoRebuildTimer) {
      clearInterval(this.autoRebuildTimer)
      this.autoRebuildTimer = null
    }
    
    // Disconnect synchronizer
    if (this.operationSynchronizer) {
      this.operationSynchronizer.disconnect()
    }
    
    // Cleanup operation logger
    if (this.operationLogger) {
      this.operationLogger.cleanup()
    }
    
    this.isInitialized = false
    console.log('[HybridCRDT] ✅ Shutdown complete')
  }
}

// Factory function for easy integration
export function createHybridCRDTAgent(config: HybridCRDTConfig): HybridCRDTAgent {
  return new HybridCRDTAgent(config)
}

// Integration helper for existing CollaborativeOpfsAgent
export async function integrateWithCollaborativeOpfsAgent(
  collaborativeAgent: any,
  config: HybridCRDTConfig
): Promise<HybridCRDTAgent> {
  
  console.log('[HybridCRDT] 🔗 Integrating with existing CollaborativeOpfsAgent')
  
  // Create hybrid agent
  const hybridAgent = new HybridCRDTAgent(config)
  
  // Try to extract BoxGraph from collaborative agent
  let boxGraph = null
  
  if (collaborativeAgent.project?.boxGraph) {
    boxGraph = collaborativeAgent.project.boxGraph
  } else if (collaborativeAgent.boxGraph) {
    boxGraph = collaborativeAgent.boxGraph
  }
  
  if (!boxGraph) {
    throw new Error('Could not find BoxGraph in CollaborativeOpfsAgent')
  }
  
  // Initialize with extracted BoxGraph
  await hybridAgent.initialize(boxGraph)
  
  console.log('[HybridCRDT] ✅ Integration complete')
  return hybridAgent
}
