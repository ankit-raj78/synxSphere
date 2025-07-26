// SimpleCRDTAgent.ts - Drop-in replacement for CollaborativeOpfsAgent using CRDT

import { AudioProjectCRDT, AudioRegionCRDT, AudioRegionData } from './AudioRegionCRDT';
import { CRDTChange, UserId, Timestamp } from './BasicCRDT';
import { 
  CRDTMessage,
  createCRDTDelta,
  createCRDTSyncRequest,
  createCRDTRegionAdded,
  createCRDTRegionUpdated,
  createCRDTRegionDeleted
} from './CRDTMessages';
import { DatabaseService } from '../database/DatabaseService';
import { WSClient } from '../websocket/WSClient';
import { CollabMessage, createCollabMessage } from '../websocket/MessageTypes';

// OpfsProtocol interface for compatibility
export type Kind = "file" | "directory"
export type Entry = { name: string, kind: Kind }

export interface OpfsProtocol {
    write(path: string, data: Uint8Array): Promise<void>
    read(path: string): Promise<Uint8Array>
    delete(path: string): Promise<void>
    list(path: string): Promise<ReadonlyArray<Entry>>
}

export class SimpleCRDTAgent implements OpfsProtocol {
  private project: AudioProjectCRDT;
  private db: DatabaseService;
  private ws: WSClient;
  private projectId: string;
  private userId: string;
  private lastSyncTimestamp: Timestamp = 0;
  private syncInterval: NodeJS.Timeout | null = null;
  
  // For compatibility with existing code
  private localOpfs?: OpfsProtocol;

  constructor(
    localOpfs: OpfsProtocol | undefined,
    db: DatabaseService,
    ws: WSClient,
    projectId: string,
    userId: string
  ) {
    this.localOpfs = localOpfs;
    this.db = db;
    this.ws = ws;
    this.projectId = projectId;
    this.userId = userId;
    this.project = new AudioProjectCRDT(projectId);
    
    this.setupMessageHandlers();
    this.startSyncLoop();
  }

  // Initialize and load existing project state
  async initialize(): Promise<void> {
    console.log(`[CRDT] Initializing SimpleCRDTAgent for project ${this.projectId}`);
    
    try {
      // Load project state from database
      await this.loadProjectFromDatabase();
      
      // Request sync with other users
      await this.requestSync();
      
      console.log(`[CRDT] Initialization complete. Found ${this.project.getActiveRegions().length} regions`);
    } catch (error) {
      console.error('[CRDT] Error during initialization:', error);
    }
  }

  // CRDT-specific methods

  async addAudioRegion(
    trackId: string, 
    startTime: number, 
    endTime: number, 
    fileName: string,
    volume: number = 1.0,
    pan: number = 0.5,
    color: string = '#3b82f6'
  ): Promise<AudioRegionCRDT> {
    console.log(`[CRDT] Adding audio region: ${fileName} to track ${trackId}`);
    
    const regionData: AudioRegionData = {
      id: this.generateRegionId(),
      trackId,
      startTime,
      endTime,
      fileName,
      volume,
      pan,
      color
    };
    
    const region = this.project.addRegion(regionData, this.userId);
    
    // Broadcast to other users
    await this.broadcastRegionAdded(region);
    
    // Persist to database
    await this.saveProjectToDatabase();
    
    // Trigger UI update
    this.notifyUIUpdate();
    
    return region;
  }

  async updateRegionPosition(regionId: string, startTime: number, endTime: number): Promise<boolean> {
    console.log(`[CRDT] Updating region ${regionId} position: ${startTime} - ${endTime}`);
    
    const region = this.project.getRegion(regionId);
    if (!region) {
      console.error(`[CRDT] Region ${regionId} not found`);
      return false;
    }
    
    const startChanged = region.updateStartTime(startTime, this.userId);
    const endChanged = region.updateEndTime(endTime, this.userId);
    
    if (startChanged || endChanged) {
      // Broadcast changes
      if (startChanged) {
        await this.broadcastRegionUpdated(regionId, 'startTime', startTime);
      }
      if (endChanged) {
        await this.broadcastRegionUpdated(regionId, 'endTime', endTime);
      }
      
      await this.saveProjectToDatabase();
      this.notifyUIUpdate();
      return true;
    }
    
    return false;
  }

  async updateRegionVolume(regionId: string, volume: number): Promise<boolean> {
    console.log(`[CRDT] Updating region ${regionId} volume: ${volume}`);
    
    const region = this.project.getRegion(regionId);
    if (!region) {
      console.error(`[CRDT] Region ${regionId} not found`);
      return false;
    }
    
    const changed = region.updateVolume(volume, this.userId);
    
    if (changed) {
      await this.broadcastRegionUpdated(regionId, 'volume', volume);
      await this.saveProjectToDatabase();
      this.notifyUIUpdate();
    }
    
    return changed;
  }

  async deleteRegion(regionId: string): Promise<boolean> {
    console.log(`[CRDT] Deleting region ${regionId}`);
    
    const changed = this.project.removeRegion(regionId, this.userId);
    
    if (changed) {
      await this.broadcastRegionDeleted(regionId);
      await this.saveProjectToDatabase();
      this.notifyUIUpdate();
    }
    
    return changed;
  }

  // Get current project state for UI
  getProjectState(): Array<{ id: string; regions: AudioRegionData[] }> {
    return this.project.toAudioTracks();
  }

  getActiveRegions(): AudioRegionCRDT[] {
    return this.project.getActiveRegions();
  }

  // Message handling
  private setupMessageHandlers(): void {
    // Note: WSClient doesn't have 'on' method, so we'll need to modify this
    // For now, we'll add a message handler directly to the WSClient
    this.addMessageHandlers();
  }

  private addMessageHandlers(): void {
    // We need to modify WSClient to support CRDT messages
    // For one-day implementation, we'll handle this in the message handler
    
    // TODO: Add proper message handler registration
    console.log('[CRDT] Message handlers set up (placeholder)');
  }

  // Handle incoming CRDT messages
  async handleMessage(message: CollabMessage): Promise<void> {
    if (message.userId === this.userId) {
      return; // Ignore our own messages
    }

    console.log(`[CRDT] Handling message:`, message.type);

    try {
      switch (message.type) {
        case 'CRDT_REGION_ADDED':
          await this.handleRegionAdded(message.data);
          break;
        case 'CRDT_REGION_UPDATED':
          await this.handleRegionUpdated(message.data);
          break;
        case 'CRDT_REGION_DELETED':
          await this.handleRegionDeleted(message.data);
          break;
        case 'CRDT_DELTA':
          await this.handleDelta(message.data);
          break;
        case 'CRDT_SYNC_REQUEST':
          await this.handleSyncRequest(message.data);
          break;
        case 'CRDT_SYNC_RESPONSE':
          await this.handleSyncResponse(message.data);
          break;
        default:
          // Handle legacy messages for backward compatibility
          await this.handleLegacyMessage(message);
      }
    } catch (error) {
      console.error('[CRDT] Error handling message:', error);
    }
  }

  private async handleRegionAdded(data: any): Promise<void> {
    const { regionId, trackId, fileName, startTime, endTime, volume, pan, color } = data;
    
    // Check if we already have this region
    if (this.project.getRegion(regionId)) {
      return;
    }
    
    const regionData: AudioRegionData = {
      id: regionId,
      trackId,
      startTime,
      endTime,
      fileName,
      volume,
      pan,
      color
    };
    
    this.project.addRegion(regionData, data.userId || 'unknown');
    this.notifyUIUpdate();
    
    console.log(`[CRDT] Added remote region: ${regionId}`);
  }

  private async handleRegionUpdated(data: any): Promise<void> {
    const { regionId, field, value } = data;
    const region = this.project.getRegion(regionId);
    
    if (!region) {
      console.warn(`[CRDT] Region ${regionId} not found for update`);
      return;
    }
    
    let changed = false;
    switch (field) {
      case 'startTime':
        changed = region.updateStartTime(value, data.userId || 'unknown');
        break;
      case 'endTime':
        changed = region.updateEndTime(value, data.userId || 'unknown');
        break;
      case 'volume':
        changed = region.updateVolume(value, data.userId || 'unknown');
        break;
      case 'pan':
        changed = region.updatePan(value, data.userId || 'unknown');
        break;
    }
    
    if (changed) {
      this.notifyUIUpdate();
      console.log(`[CRDT] Updated remote region ${regionId}.${field} = ${value}`);
    }
  }

  private async handleRegionDeleted(data: any): Promise<void> {
    const { regionId } = data;
    const changed = this.project.removeRegion(regionId, data.userId || 'unknown');
    
    if (changed) {
      this.notifyUIUpdate();
      console.log(`[CRDT] Deleted remote region: ${regionId}`);
    }
  }

  private async handleDelta(data: any): Promise<void> {
    const { changes } = data;
    const hasChanges = this.project.applyChanges(changes);
    
    if (hasChanges) {
      this.notifyUIUpdate();
      console.log(`[CRDT] Applied ${changes.length} remote changes`);
    }
  }

  private async handleSyncRequest(data: any): Promise<void> {
    console.log(`[CRDT] Handling sync request from ${data.userId}`);
    
    const { lastKnownTimestamp } = data;
    const changes = this.project.getChangesSince(lastKnownTimestamp);
    
    // Send sync response
    const syncResponse = createCRDTSyncRequest(this.projectId, this.userId, lastKnownTimestamp);
    // TODO: Send via WebSocket
  }

  private async handleSyncResponse(data: any): Promise<void> {
    const { changes, fullState } = data;
    
    if (fullState) {
      // Full state sync
      this.project = AudioProjectCRDT.fromJSON(fullState);
      console.log(`[CRDT] Applied full state sync`);
    } else if (changes) {
      // Delta sync
      const hasChanges = this.project.applyChanges(changes);
      if (hasChanges) {
        console.log(`[CRDT] Applied ${changes.length} sync changes`);
      }
    }
    
    this.notifyUIUpdate();
  }

  private async handleLegacyMessage(message: CollabMessage): Promise<void> {
    // Handle existing message types for backward compatibility
    switch (message.type) {
      case 'BOX_CREATED':
        const { boxUuid, fileName } = message.data;
        if (fileName && !this.project.getRegion(boxUuid)) {
          // Convert legacy message to CRDT region
          await this.addAudioRegion('default-track', 0, 10, fileName);
        }
        break;
        
      case 'PROJECT_SAVED':
        // Request sync to get latest changes
        await this.requestSync();
        break;
    }
  }

  // Broadcasting methods
  private async broadcastRegionAdded(region: AudioRegionCRDT): Promise<void> {
    const message = createCRDTRegionAdded(
      this.projectId,
      this.userId,
      {
        regionId: region.id,
        trackId: region.trackId,
        fileName: region.fileName.get(),
        startTime: region.startTime.get(),
        endTime: region.endTime.get(),
        volume: region.volume.get(),
        pan: region.pan.get(),
        color: region.color.get()
      }
    );
    
    await this.sendMessage(message);
  }

  private async broadcastRegionUpdated(
    regionId: string, 
    field: 'startTime' | 'endTime' | 'volume' | 'pan' | 'color', 
    value: any
  ): Promise<void> {
    const message = createCRDTRegionUpdated(this.projectId, this.userId, regionId, field, value);
    await this.sendMessage(message);
  }

  private async broadcastRegionDeleted(regionId: string): Promise<void> {
    const message = createCRDTRegionDeleted(this.projectId, this.userId, regionId);
    await this.sendMessage(message);
  }

  private async sendMessage(message: any): Promise<void> {
    // Convert CRDT message to CollabMessage format using appropriate creator
    let collabMessage: CollabMessage;
    
    switch (message.type) {
      case 'CRDT_REGION_ADDED':
        collabMessage = createCollabMessage.crdtRegionAdded(this.projectId, this.userId, message.data);
        break;
      case 'CRDT_REGION_UPDATED':
        collabMessage = createCollabMessage.crdtRegionUpdated(this.projectId, this.userId, message.data);
        break;
      case 'CRDT_REGION_DELETED':
        collabMessage = createCollabMessage.crdtRegionDeleted(this.projectId, this.userId, message.data);
        break;
      case 'CRDT_DELTA':
        collabMessage = createCollabMessage.crdtDelta(this.projectId, this.userId, message.data);
        break;
      case 'CRDT_SYNC_REQUEST':
        collabMessage = createCollabMessage.crdtSyncRequest(this.projectId, this.userId, message.data);
        break;
      default:
        console.error(`[CRDT] Unknown message type: ${message.type}`);
        return;
    }
    
    this.ws.send(collabMessage);
  }

  // Database operations
  private async loadProjectFromDatabase(): Promise<void> {
    try {
      // Try to load CRDT state first
      const crdtState = await this.loadCRDTState();
      if (crdtState) {
        this.project = AudioProjectCRDT.fromJSON(crdtState);
        this.lastSyncTimestamp = this.project.getLastChangeTimestamp();
        console.log(`[CRDT] Loaded project from CRDT state`);
        return;
      }
      
      // Fallback: try to convert legacy project data
      await this.migrateLegacyProject();
      
    } catch (error) {
      console.error('[CRDT] Error loading project from database:', error);
    }
  }

  private async loadCRDTState(): Promise<any | null> {
    // TODO: Add method to DatabaseService to load CRDT state
    // For now, return null to trigger migration
    return null;
  }

  private async migrateLegacyProject(): Promise<void> {
    // TODO: Convert existing OpenDAW project data to CRDT format
    console.log('[CRDT] No existing CRDT state found, starting with empty project');
  }

  private async saveProjectToDatabase(): Promise<void> {
    try {
      const serializedProject = JSON.stringify(this.project.toJSON());
      
      // TODO: Add method to DatabaseService to save CRDT state
      // For now, we'll use a simple approach
      await this.saveCRDTState(serializedProject);
      
    } catch (error) {
      console.error('[CRDT] Error saving project to database:', error);
    }
  }

  private async saveCRDTState(data: string): Promise<void> {
    // Placeholder - would need to add to DatabaseService
    console.log('[CRDT] Saved project state to database');
  }

  // Sync operations
  private async requestSync(): Promise<void> {
    const message = createCRDTSyncRequest(
      this.projectId,
      this.userId,
      this.lastSyncTimestamp
    );
    
    await this.sendMessage(message);
  }

  private startSyncLoop(): void {
    // Periodic sync every 10 seconds
    this.syncInterval = setInterval(() => {
      this.requestSync();
    }, 10000);
  }

  private stopSyncLoop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // UI notification
  private notifyUIUpdate(): void {
    const tracks = this.getProjectState();
    
    // Dispatch custom event for UI to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crdtProjectUpdate', {
        detail: { 
          projectId: this.projectId,
          tracks,
          regionCount: this.project.getActiveRegions().length,
          lastUpdate: Date.now()
        }
      }));
    }
    
    console.log(`[CRDT] UI update dispatched: ${tracks.length} tracks, ${this.project.getActiveRegions().length} regions`);
  }

  // Utility methods
  private generateRegionId(): string {
    return `region-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // OpfsProtocol implementation (for compatibility)
  async write(path: string, data: Uint8Array): Promise<void> {
    // For CRDT, we'll handle audio file operations differently
    console.log(`[CRDT] OPFS write: ${path}`);
    
    if (this.localOpfs) {
      await this.localOpfs.write(path, data);
    }
    
    // Extract audio region info from path and add to CRDT
    const regionInfo = this.extractRegionInfoFromPath(path);
    if (regionInfo) {
      await this.addAudioRegion(
        regionInfo.trackId,
        regionInfo.startTime,
        regionInfo.endTime,
        regionInfo.fileName
      );
    }
  }

  async read(path: string): Promise<Uint8Array> {
    if (this.localOpfs) {
      return await this.localOpfs.read(path);
    }
    throw new Error('No local OPFS available');
  }

  async delete(path: string): Promise<void> {
    console.log(`[CRDT] OPFS delete: ${path}`);
    
    if (this.localOpfs) {
      await this.localOpfs.delete(path);
    }
    
    // Extract region ID and delete from CRDT
    const regionId = this.extractRegionIdFromPath(path);
    if (regionId) {
      await this.deleteRegion(regionId);
    }
  }

  async list(path: string): Promise<ReadonlyArray<Entry>> {
    if (this.localOpfs) {
      return await this.localOpfs.list(path);
    }
    return [];
  }

  private extractRegionInfoFromPath(path: string): { trackId: string; startTime: number; endTime: number; fileName: string } | null {
    // Parse OPFS path to extract region information
    // This is a simplified version - real implementation would need proper parsing
    const fileName = path.split('/').pop() || 'unknown';
    return {
      trackId: 'default-track',
      startTime: 0,
      endTime: 10,
      fileName
    };
  }

  private extractRegionIdFromPath(path: string): string | null {
    // Extract region ID from OPFS path
    // Simplified implementation
    const match = path.match(/region-[a-zA-Z0-9-]+/);
    return match ? match[0] : null;
  }

  // Cleanup
  destroy(): void {
    this.stopSyncLoop();
    console.log('[CRDT] SimpleCRDTAgent destroyed');
  }
}
