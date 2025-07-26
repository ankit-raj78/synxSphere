// AudioRegionCRDT.ts - CRDT for collaborative audio regions

import { LWWRegister, ORSet, CRDTChange, ChangeTracker, UserId, Timestamp } from './BasicCRDT';

export interface AudioRegionData {
  id: string;
  trackId: string;
  startTime: number;
  endTime: number;
  fileName: string;
  volume: number;
  pan: number;
  color: string;
}

export class AudioRegionCRDT {
  public readonly id: string;
  public readonly trackId: string;
  
  // CRDT fields
  public startTime: LWWRegister<number>;
  public endTime: LWWRegister<number>;
  public fileName: LWWRegister<string>;
  public volume: LWWRegister<number>;
  public pan: LWWRegister<number>;
  public color: LWWRegister<string>;
  public isDeleted: LWWRegister<boolean>;
  
  // Metadata
  public createdBy: UserId;
  public createdAt: Timestamp;

  constructor(data: AudioRegionData, userId: UserId, timestamp: Timestamp = Date.now()) {
    this.id = data.id;
    this.trackId = data.trackId;
    this.createdBy = userId;
    this.createdAt = timestamp;
    
    // Initialize CRDT fields
    this.startTime = new LWWRegister(data.startTime, userId, timestamp);
    this.endTime = new LWWRegister(data.endTime, userId, timestamp);
    this.fileName = new LWWRegister(data.fileName, userId, timestamp);
    this.volume = new LWWRegister(data.volume, userId, timestamp);
    this.pan = new LWWRegister(data.pan, userId, timestamp);
    this.color = new LWWRegister(data.color, userId, timestamp);
    this.isDeleted = new LWWRegister(false, userId, timestamp);
  }

  // Update operations with change tracking
  updateStartTime(value: number, userId: UserId, changeTracker?: ChangeTracker): boolean {
    const timestamp = Date.now();
    const changed = this.startTime.set(value, userId, timestamp);
    if (changed && changeTracker) {
      changeTracker.addChange({
        type: 'lww-set',
        path: `regions.${this.id}.startTime`,
        data: { value, userId, timestamp },
        timestamp,
        userId
      });
    }
    return changed;
  }

  updateEndTime(value: number, userId: UserId, changeTracker?: ChangeTracker): boolean {
    const timestamp = Date.now();
    const changed = this.endTime.set(value, userId, timestamp);
    if (changed && changeTracker) {
      changeTracker.addChange({
        type: 'lww-set',
        path: `regions.${this.id}.endTime`,
        data: { value, userId, timestamp },
        timestamp,
        userId
      });
    }
    return changed;
  }

  updateVolume(value: number, userId: UserId, changeTracker?: ChangeTracker): boolean {
    const timestamp = Date.now();
    const changed = this.volume.set(value, userId, timestamp);
    if (changed && changeTracker) {
      changeTracker.addChange({
        type: 'lww-set',
        path: `regions.${this.id}.volume`,
        data: { value, userId, timestamp },
        timestamp,
        userId
      });
    }
    return changed;
  }

  updatePan(value: number, userId: UserId, changeTracker?: ChangeTracker): boolean {
    const changed = this.pan.set(value, userId);
    if (changed && changeTracker) {
      changeTracker.addChange({
        type: 'lww-set',
        path: `regions.${this.id}.pan`,
        data: { value, userId, timestamp: Date.now() },
        timestamp: Date.now(),
        userId
      });
    }
    return changed;
  }

  delete(userId: UserId, changeTracker?: ChangeTracker): boolean {
    const changed = this.isDeleted.set(true, userId);
    if (changed && changeTracker) {
      changeTracker.addChange({
        type: 'lww-set',
        path: `regions.${this.id}.isDeleted`,
        data: { value: true, userId, timestamp: Date.now() },
        timestamp: Date.now(),
        userId
      });
    }
    return changed;
  }

  // Convenience methods
  isActive(): boolean {
    return !this.isDeleted.get();
  }

  getDuration(): number {
    return Math.max(0, this.endTime.get() - this.startTime.get());
  }

  // Convert to plain object for UI
  toAudioRegionData(): AudioRegionData {
    return {
      id: this.id,
      trackId: this.trackId,
      startTime: this.startTime.get(),
      endTime: this.endTime.get(),
      fileName: this.fileName.get(),
      volume: this.volume.get(),
      pan: this.pan.get(),
      color: this.color.get()
    };
  }

  // Merge with another AudioRegionCRDT
  merge(other: AudioRegionCRDT): boolean {
    if (this.id !== other.id) {
      throw new Error(`Cannot merge regions with different IDs: ${this.id} vs ${other.id}`);
    }

    let changed = false;
    changed = this.startTime.merge(other.startTime) || changed;
    changed = this.endTime.merge(other.endTime) || changed;
    changed = this.fileName.merge(other.fileName) || changed;
    changed = this.volume.merge(other.volume) || changed;
    changed = this.pan.merge(other.pan) || changed;
    changed = this.color.merge(other.color) || changed;
    changed = this.isDeleted.merge(other.isDeleted) || changed;
    
    return changed;
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      trackId: this.trackId,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      startTime: this.startTime.toJSON(),
      endTime: this.endTime.toJSON(),
      fileName: this.fileName.toJSON(),
      volume: this.volume.toJSON(),
      pan: this.pan.toJSON(),
      color: this.color.toJSON(),
      isDeleted: this.isDeleted.toJSON()
    };
  }

  static fromJSON(data: any): AudioRegionCRDT {
    // Create dummy region data for constructor
    const regionData: AudioRegionData = {
      id: data.id,
      trackId: data.trackId,
      startTime: data.startTime.value,
      endTime: data.endTime.value,
      fileName: data.fileName.value,
      volume: data.volume.value,
      pan: data.pan.value,
      color: data.color.value
    };
    
    const region = new AudioRegionCRDT(regionData, data.createdBy, data.createdAt);
    
    // Restore CRDT states
    region.startTime = LWWRegister.fromJSON(data.startTime);
    region.endTime = LWWRegister.fromJSON(data.endTime);
    region.fileName = LWWRegister.fromJSON(data.fileName);
    region.volume = LWWRegister.fromJSON(data.volume);
    region.pan = LWWRegister.fromJSON(data.pan);
    region.color = LWWRegister.fromJSON(data.color);
    region.isDeleted = LWWRegister.fromJSON(data.isDeleted);
    
    return region;
  }
}

// Project-level CRDT containing all audio regions
export class AudioProjectCRDT {
  public readonly id: string;
  private regions: ORSet<AudioRegionCRDT>;
  private regionMap: Map<string, AudioRegionCRDT>; // For quick lookups
  private changeTracker: ChangeTracker;

  constructor(projectId: string) {
    this.id = projectId;
    this.regions = new ORSet();
    this.regionMap = new Map();
    this.changeTracker = new ChangeTracker();
  }

  // Add new audio region
  addRegion(regionData: AudioRegionData, userId: UserId): AudioRegionCRDT {
    const region = new AudioRegionCRDT(regionData, userId);
    
    this.regions.add(region, userId);
    this.regionMap.set(region.id, region);
    
    // Track change
    this.changeTracker.addChange({
      type: 'orset-add',
      path: `regions.${region.id}`,
      data: region.toJSON(),
      timestamp: Date.now(),
      userId
    });

    console.log(`[CRDT] Added region ${region.id}: ${regionData.fileName}`);
    return region;
  }

  // Remove audio region
  removeRegion(regionId: string, userId: UserId): boolean {
    const region = this.regionMap.get(regionId);
    if (!region) {
      console.warn(`[CRDT] Region ${regionId} not found for removal`);
      return false;
    }

    // Soft delete
    const changed = region.delete(userId, this.changeTracker);
    
    if (changed) {
      console.log(`[CRDT] Removed region ${regionId}`);
    }
    
    return changed;
  }

  // Get region by ID
  getRegion(regionId: string): AudioRegionCRDT | undefined {
    return this.regionMap.get(regionId);
  }

  // Get all active regions
  getActiveRegions(): AudioRegionCRDT[] {
    return Array.from(this.regionMap.values()).filter(region => region.isActive());
  }

  // Get regions for specific track
  getRegionsForTrack(trackId: string): AudioRegionCRDT[] {
    return this.getActiveRegions().filter(region => region.trackId === trackId);
  }

  // Get changes since timestamp for synchronization
  getChangesSince(timestamp: Timestamp): CRDTChange[] {
    return this.changeTracker.getChangesSince(timestamp);
  }

  getLastChangeTimestamp(): Timestamp {
    return this.changeTracker.getLastTimestamp();
  }

  // Apply remote changes
  applyChanges(changes: CRDTChange[]): boolean {
    let hasChanges = false;

    for (const change of changes) {
      try {
        switch (change.type) {
          case 'orset-add':
            if (change.path.startsWith('regions.')) {
              const regionData = change.data;
              const region = AudioRegionCRDT.fromJSON(regionData);
              
              if (!this.regionMap.has(region.id)) {
                this.regions.add(region, change.userId);
                this.regionMap.set(region.id, region);
                hasChanges = true;
                console.log(`[CRDT] Applied remote region add: ${region.id}`);
              }
            }
            break;

          case 'lww-set':
            const pathParts = change.path.split('.');
            if (pathParts.length === 3 && pathParts[0] === 'regions') {
              const regionId = pathParts[1];
              const field = pathParts[2];
              const region = this.regionMap.get(regionId);
              
              if (region) {
                const { value, userId, timestamp } = change.data;
                switch (field) {
                  case 'startTime':
                    hasChanges = region.startTime.set(value, userId, timestamp) || hasChanges;
                    break;
                  case 'endTime':
                    hasChanges = region.endTime.set(value, userId, timestamp) || hasChanges;
                    break;
                  case 'volume':
                    hasChanges = region.volume.set(value, userId, timestamp) || hasChanges;
                    break;
                  case 'pan':
                    hasChanges = region.pan.set(value, userId, timestamp) || hasChanges;
                    break;
                  case 'isDeleted':
                    hasChanges = region.isDeleted.set(value, userId, timestamp) || hasChanges;
                    break;
                }
              }
            }
            break;
        }
        
        // Add to our change tracker (avoid duplicates by checking timestamp)
        if (change.timestamp > this.changeTracker.getLastTimestamp()) {
          this.changeTracker.addChange(change);
        }
        
      } catch (error) {
        console.error(`[CRDT] Error applying change:`, change, error);
      }
    }

    return hasChanges;
  }

  // Merge with another project
  merge(other: AudioProjectCRDT): boolean {
    let changed = false;
    
    // Merge regions
    changed = this.regions.merge(other.regions) || changed;
    
    // Update region map and merge individual regions
    for (const region of other.regions.values()) {
      const existingRegion = this.regionMap.get(region.id);
      if (existingRegion) {
        changed = existingRegion.merge(region) || changed;
      } else {
        this.regionMap.set(region.id, region);
        changed = true;
      }
    }

    return changed;
  }

  // Convert to format expected by existing UI
  toAudioTracks(): Array<{ id: string; regions: AudioRegionData[] }> {
    const trackMap = new Map<string, AudioRegionData[]>();
    
    for (const region of this.getActiveRegions()) {
      const trackId = region.trackId;
      if (!trackMap.has(trackId)) {
        trackMap.set(trackId, []);
      }
      trackMap.get(trackId)!.push(region.toAudioRegionData());
    }

    return Array.from(trackMap.entries()).map(([id, regions]) => ({
      id,
      regions: regions.sort((a, b) => a.startTime - b.startTime)
    }));
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      regions: this.regions.toJSON(),
      changeTracker: this.changeTracker.toJSON()
    };
  }

  static fromJSON(data: any): AudioProjectCRDT {
    const project = new AudioProjectCRDT(data.id);
    project.regions = ORSet.fromJSON(data.regions);
    project.changeTracker = ChangeTracker.fromJSON(data.changeTracker);
    
    // Rebuild region map
    for (const region of project.regions.values()) {
      project.regionMap.set(region.id, region);
    }
    
    return project;
  }
}
