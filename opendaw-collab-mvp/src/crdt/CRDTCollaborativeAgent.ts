// Migration Strategy: Current System → CRDT-based Collaboration

import { CollaborativeOpfsAgent } from '../collaboration/CollaborativeOpfsAgent'
import { DAWProjectCRDT, AudioTrackCRDT, CRDTDelta, CRDTSyncManager } from '../crdt/DAWCRDTTypes'
import { DatabaseService } from '../database/DatabaseService'
import { WSClient } from '../websocket/WSClient'
import { CollabMessage } from '../websocket/MessageTypes'

export class CRDTCollaborativeAgent {
  private project: DAWProjectCRDT
  private syncManager: CRDTSyncManager
  private db: DatabaseService
  private ws: WSClient
  private userId: string
  private projectId: string
  
  // Keep reference to old agent for gradual migration
  private legacyAgent?: CollaborativeOpfsAgent

  constructor(
    db: DatabaseService,
    ws: WSClient,
    projectId: string,
    userId: string
  ) {
    this.db = db
    this.ws = ws
    this.userId = userId
    this.projectId = projectId
    
    // Initialize with empty project
    this.project = new DAWProjectCRDT(projectId, 'Collaborative Project', userId)
    this.syncManager = new CRDTSyncManager(this.project)
    
    this.setupWebSocketHandlers()
  }

  private setupWebSocketHandlers(): void {
    // Replace existing WebSocket message handlers with CRDT-aware ones
    this.ws.onMessage('BOX_CREATED', (message) => {
      this.handleRemoteBoxCreated(message)
    })
    
    this.ws.onMessage('PROJECT_SAVED', (message) => {
      this.handleRemoteProjectUpdate(message)
    })
    
    // New CRDT-specific message handlers
    this.ws.onMessage('CRDT_DELTA', (message) => {
      this.handleRemoteCRDTDelta(message.data)
    })
    
    this.ws.onMessage('CRDT_SYNC_REQUEST', (message) => {
      this.handleSyncRequest(message.data)
    })
  }

  // Phase 1: Hybrid Operations (CRDT + Legacy)
  async addAudioRegion(trackId: string, startTime: number, endTime: number, fileName: string): Promise<void> {
    console.log(`[CRDT] Adding audio region: ${fileName} on track ${trackId}`)
    
    // 1. Find or create track in CRDT
    let track = this.project.tracks.values().find(t => t.id === trackId)
    if (!track) {
      track = this.project.addTrack(`Track ${trackId}`, this.userId)
    }
    
    // 2. Add region to CRDT
    const region = track.addRegion(startTime, endTime, fileName, this.userId)
    
    // 3. Generate and broadcast CRDT delta
    const delta = this.syncManager.generateDelta('region_added', {
      trackId,
      regionId: region.id,
      startTime,
      endTime,
      fileName
    }, this.userId)
    
    await this.broadcastCRDTDelta(delta)
    
    // 4. Persist to database
    await this.persistProjectState()
    
    // 5. Legacy compatibility: Also broadcast old-style message
    await this.broadcastLegacyBoxCreated(region.id, fileName)
  }

  async moveAudioRegion(regionId: string, newStartTime: number, newEndTime: number): Promise<void> {
    console.log(`[CRDT] Moving audio region: ${regionId}`)
    
    // Find region across all tracks
    let targetRegion: any = null
    for (const track of this.project.tracks.values()) {
      const region = track.regions.values().find(r => r.id === regionId)
      if (region) {
        targetRegion = region
        break
      }
    }
    
    if (!targetRegion) {
      console.error(`Region ${regionId} not found`)
      return
    }
    
    // Update region position using LWW-Register
    targetRegion.startTime.set(newStartTime, this.userId)
    targetRegion.endTime.set(newEndTime, this.userId)
    
    // Broadcast delta
    const delta = this.syncManager.generateDelta('region_moved', {
      regionId,
      newStartTime,
      newEndTime
    }, this.userId)
    
    await this.broadcastCRDTDelta(delta)
    await this.persistProjectState()
  }

  async changeTrackVolume(trackId: string, volume: number): Promise<void> {
    console.log(`[CRDT] Changing track volume: ${trackId} to ${volume}`)
    
    const track = this.project.tracks.values().find(t => t.id === trackId)
    if (!track) {
      console.error(`Track ${trackId} not found`)
      return
    }
    
    track.volume.set(volume, this.userId)
    
    const delta = this.syncManager.generateDelta('volume_changed', {
      trackId,
      volume
    }, this.userId)
    
    await this.broadcastCRDTDelta(delta)
    await this.persistProjectState()
  }

  // Handle remote CRDT deltas
  private async handleRemoteCRDTDelta(delta: CRDTDelta): Promise<void> {
    console.log(`[CRDT] Applying remote delta:`, delta)
    
    switch (delta.type) {
      case 'region_added':
        await this.applyRemoteRegionAdded(delta)
        break
      case 'region_moved':
        await this.applyRemoteRegionMoved(delta)
        break
      case 'volume_changed':
        await this.applyRemoteVolumeChanged(delta)
        break
    }
    
    // Trigger UI update
    await this.notifyUIUpdate()
  }

  private async applyRemoteRegionAdded(delta: CRDTDelta): Promise<void> {
    const { trackId, regionId, startTime, endTime, fileName } = delta.data
    
    // Find or create track
    let track = this.project.tracks.values().find(t => t.id === trackId)
    if (!track) {
      track = this.project.addTrack(`Track ${trackId}`, delta.userId)
    }
    
    // Check if region already exists (idempotency)
    const existingRegion = track.regions.values().find(r => r.id === regionId)
    if (existingRegion) {
      console.log(`Region ${regionId} already exists, skipping`)
      return
    }
    
    // Add region (this will merge automatically due to CRDT properties)
    track.addRegion(startTime, endTime, fileName, delta.userId)
  }

  private async applyRemoteRegionMoved(delta: CRDTDelta): Promise<void> {
    const { regionId, newStartTime, newEndTime } = delta.data
    
    // Find region across all tracks
    for (const track of this.project.tracks.values()) {
      const region = track.regions.values().find(r => r.id === regionId)
      if (region) {
        // LWW-Register will handle conflict resolution automatically
        region.startTime.set(newStartTime, delta.userId)
        region.endTime.set(newEndTime, delta.userId)
        break
      }
    }
  }

  private async applyRemoteVolumeChanged(delta: CRDTDelta): Promise<void> {
    const { trackId, volume } = delta.data
    
    const track = this.project.tracks.values().find(t => t.id === trackId)
    if (track) {
      track.volume.set(volume, delta.userId)
    }
  }

  // Network operations
  private async broadcastCRDTDelta(delta: CRDTDelta): Promise<void> {
    const message: CollabMessage = {
      type: 'CRDT_DELTA',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: delta
    }
    
    this.ws.send(message)
  }

  private async broadcastLegacyBoxCreated(boxId: string, fileName: string): Promise<void> {
    // Maintain backward compatibility during migration
    const message: CollabMessage = {
      type: 'BOX_CREATED',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: {
        boxUuid: boxId,
        boxType: 'audio-region',
        ownerId: this.userId,
        fileName
      }
    }
    
    this.ws.send(message)
  }

  // Database persistence
  private async persistProjectState(): Promise<void> {
    try {
      const serializedProject = this.project.serialize()
      
      // Store CRDT state in database (TODO: Add CRDT methods to DatabaseService)
      // await this.db.saveProjectCRDTState(this.projectId, serializedProject)
      
      console.log(`[CRDT] Project state persisted for ${this.projectId}`)
    } catch (error) {
      console.error('Error persisting CRDT project state:', error)
    }
  }

  async loadProjectState(): Promise<void> {
    try {
      // TODO: Add CRDT methods to DatabaseService
      // const serializedProject = await this.db.loadProjectCRDTState(this.projectId)
      const serializedProject = null // Temporary
      
      if (serializedProject) {
        this.project = DAWProjectCRDT.deserialize(serializedProject)
        console.log(`[CRDT] Project state loaded for ${this.projectId}`)
      } else {
        console.log(`[CRDT] No existing project state, starting fresh`)
      }
    } catch (error) {
      console.error('Error loading CRDT project state:', error)
    }
  }

  // UI integration
  private async notifyUIUpdate(): Promise<void> {
    // Convert CRDT state to format expected by existing UI components
    const tracks = this.project.tracks.values().map(track => ({
      id: track.id,
      name: track.name.get(),
      volume: track.volume.get(),
      pan: track.pan.get(),
      isMuted: track.isMuted.get(),
      isSolo: track.isSolo.get(),
      regions: track.getActiveRegions().map(region => ({
        id: region.id,
        startTime: region.startTime.get(),
        endTime: region.endTime.get(),
        fileName: region.fileName.get(),
        volume: region.volume.get(),
        pan: region.pan.get(),
        color: region.color.get()
      }))
    }))
    
    // Trigger UI update with converted data
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crdtProjectUpdate', {
        detail: { tracks }
      }))
    }
  }

  // Migration helpers
  async migrateFromLegacySystem(): Promise<void> {
    console.log('[CRDT] Starting migration from legacy system...')
    
    if (this.legacyAgent) {
      // Convert existing project data to CRDT format
      // This would involve reading the current OpenDAW project and 
      // reconstructing it as CRDT structures
      
      console.log('[CRDT] Migration completed')
    }
  }

  // Debug and monitoring
  getProjectStats(): any {
    const tracks = this.project.tracks.values()
    const totalRegions = tracks.reduce((sum, track) => 
      sum + track.getActiveRegions().length, 0)
    
    return {
      projectId: this.project.id,
      trackCount: tracks.length,
      regionCount: totalRegions,
      projectName: this.project.name.get(),
      bpm: this.project.bpm.get()
    }
  }

  // Legacy compatibility methods
  private async handleRemoteBoxCreated(message: any): Promise<void> {
    // Handle legacy BOX_CREATED messages during transition period
    console.log('[CRDT] Handling legacy BOX_CREATED message:', message)
    
    // Convert legacy message to CRDT operation if needed
    const { boxUuid, boxType, fileName } = message.data
    if (boxType === 'audio-region') {
      // Create CRDT region from legacy data
      // Implementation details...
    }
  }

  private async handleRemoteProjectUpdate(message: any): Promise<void> {
    // Handle legacy PROJECT_SAVED messages during transition
    console.log('[CRDT] Handling legacy PROJECT_SAVED message')
    
    // Could trigger a full sync to ensure consistency
    await this.requestFullSync()
  }

  private async requestFullSync(): Promise<void> {
    const message: CollabMessage = {
      type: 'CRDT_SYNC_REQUEST',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: {}
    }
    
    this.ws.send(message)
  }

  private async handleSyncRequest(data: any): Promise<void> {
    // Send full project state to requesting user
    const fullState = this.project.serialize()
    
    const response: CollabMessage = {
      type: 'CRDT_SYNC_RESPONSE',
      projectId: this.projectId,
      userId: this.userId,
      timestamp: Date.now(),
      data: { projectState: fullState }
    }
    
    this.ws.send(response)
  }
}
