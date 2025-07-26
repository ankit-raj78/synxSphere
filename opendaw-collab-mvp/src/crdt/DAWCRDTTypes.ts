// CRDT Types for SynxSphere DAW Implementation

export class VectorClock {
  private clock: Map<string, number> = new Map()
  
  increment(userId: string): void {
    this.clock.set(userId, (this.clock.get(userId) || 0) + 1)
  }
  
  merge(other: VectorClock): void {
    for (const [userId, timestamp] of other.clock) {
      this.clock.set(userId, Math.max(this.clock.get(userId) || 0, timestamp))
    }
  }
  
  compare(other: VectorClock): 'before' | 'after' | 'concurrent' {
    let before = false, after = false
    
    const allUsers = new Set([...this.clock.keys(), ...other.clock.keys()])
    
    for (const userId of allUsers) {
      const myTime = this.clock.get(userId) || 0
      const otherTime = other.clock.get(userId) || 0
      
      if (myTime < otherTime) before = true
      if (myTime > otherTime) after = true
    }
    
    if (before && after) return 'concurrent'
    if (before) return 'before'
    if (after) return 'after'
    return 'concurrent' // Equal
  }
}

export class LWWRegister<T> {
  private value: T
  private timestamp: VectorClock
  private userId: string
  
  constructor(initialValue: T, userId: string) {
    this.value = initialValue
    this.timestamp = new VectorClock()
    this.userId = userId
    this.timestamp.increment(userId)
  }
  
  set(newValue: T, userId: string): void {
    const newTimestamp = new VectorClock()
    newTimestamp.merge(this.timestamp)
    newTimestamp.increment(userId)
    
    // LWW: Later timestamp wins, tie-break by userId
    const comparison = newTimestamp.compare(this.timestamp)
    if (comparison === 'after' || 
        (comparison === 'concurrent' && userId > this.userId)) {
      this.value = newValue
      this.timestamp = newTimestamp
      this.userId = userId
    }
  }
  
  get(): T {
    return this.value
  }
  
  merge(other: LWWRegister<T>): void {
    const comparison = other.timestamp.compare(this.timestamp)
    if (comparison === 'after' || 
        (comparison === 'concurrent' && other.userId > this.userId)) {
      this.value = other.value
      this.timestamp = other.timestamp
      this.userId = other.userId
    }
  }
}

export class GSet<T> {
  private elements: Set<T> = new Set()
  
  add(element: T): void {
    this.elements.add(element)
  }
  
  has(element: T): boolean {
    return this.elements.has(element)
  }
  
  values(): T[] {
    return Array.from(this.elements)
  }
  
  merge(other: GSet<T>): void {
    for (const element of other.elements) {
      this.elements.add(element)
    }
  }
}

// DAW-Specific CRDT Types

export interface AudioRegionCRDT {
  id: string // UUID - immutable identifier
  trackId: string
  startTime: LWWRegister<number>
  endTime: LWWRegister<number>
  fileName: LWWRegister<string>
  volume: LWWRegister<number>
  pan: LWWRegister<number>
  isDeleted: LWWRegister<boolean>
  color: LWWRegister<string>
  createdBy: string
  createdAt: VectorClock
}

export class AudioTrackCRDT {
  id: string
  name: LWWRegister<string>
  regions: GSet<AudioRegionCRDT>
  volume: LWWRegister<number>
  pan: LWWRegister<number>
  isMuted: LWWRegister<boolean>
  isSolo: LWWRegister<boolean>
  effects: GSet<EffectCRDT>
  
  constructor(id: string, name: string, userId: string) {
    this.id = id
    this.name = new LWWRegister(name, userId)
    this.regions = new GSet()
    this.volume = new LWWRegister(0.75, userId)
    this.pan = new LWWRegister(0.5, userId)
    this.isMuted = new LWWRegister(false, userId)
    this.isSolo = new LWWRegister(false, userId)
    this.effects = new GSet()
  }
  
  addRegion(startTime: number, endTime: number, fileName: string, userId: string): AudioRegionCRDT {
    const region: AudioRegionCRDT = {
      id: crypto.randomUUID(),
      trackId: this.id,
      startTime: new LWWRegister(startTime, userId),
      endTime: new LWWRegister(endTime, userId),
      fileName: new LWWRegister(fileName, userId),
      volume: new LWWRegister(1.0, userId),
      pan: new LWWRegister(0.5, userId),
      isDeleted: new LWWRegister(false, userId),
      color: new LWWRegister('#3b82f6', userId),
      createdBy: userId,
      createdAt: new VectorClock()
    }
    region.createdAt.increment(userId)
    
    this.regions.add(region)
    return region
  }
  
  getActiveRegions(): AudioRegionCRDT[] {
    return this.regions.values().filter(r => !r.isDeleted.get())
  }
  
  merge(other: AudioTrackCRDT): void {
    this.name.merge(other.name)
    this.volume.merge(other.volume)
    this.pan.merge(other.pan)
    this.isMuted.merge(other.isMuted)
    this.isSolo.merge(other.isSolo)
    this.regions.merge(other.regions)
    this.effects.merge(other.effects)
  }
}

export interface EffectCRDT {
  id: string
  type: string // 'reverb', 'delay', 'eq', etc.
  parameters: Map<string, LWWRegister<number>>
  isEnabled: LWWRegister<boolean>
  order: LWWRegister<number>
}

export class DAWProjectCRDT {
  id: string
  name: LWWRegister<string>
  tracks: GSet<AudioTrackCRDT>
  bpm: LWWRegister<number>
  timeSignature: LWWRegister<string>
  masterVolume: LWWRegister<number>
  
  constructor(id: string, name: string, userId: string) {
    this.id = id
    this.name = new LWWRegister(name, userId)
    this.tracks = new GSet()
    this.bpm = new LWWRegister(120, userId)
    this.timeSignature = new LWWRegister('4/4', userId)
    this.masterVolume = new LWWRegister(0.75, userId)
  }
  
  addTrack(name: string, userId: string): AudioTrackCRDT {
    const track = new AudioTrackCRDT(crypto.randomUUID(), name, userId)
    this.tracks.add(track)
    return track
  }
  
  merge(other: DAWProjectCRDT): void {
    this.name.merge(other.name)
    this.bpm.merge(other.bpm)
    this.timeSignature.merge(other.timeSignature)
    this.masterVolume.merge(other.masterVolume)
    this.tracks.merge(other.tracks)
    
    // Merge individual tracks
    const myTracks = new Map(this.tracks.values().map(t => [t.id, t]))
    const otherTracks = new Map(other.tracks.values().map(t => [t.id, t]))
    
    for (const [trackId, otherTrack] of otherTracks) {
      const myTrack = myTracks.get(trackId)
      if (myTrack) {
        myTrack.merge(otherTrack)
      }
    }
  }
  
  serialize(): Uint8Array {
    const json = JSON.stringify({
      id: this.id,
      name: this.name,
      tracks: this.tracks.values(),
      bpm: this.bpm,
      timeSignature: this.timeSignature,
      masterVolume: this.masterVolume
    })
    return new TextEncoder().encode(json)
  }
  
  static deserialize(data: Uint8Array): DAWProjectCRDT {
    const json = new TextDecoder().decode(data)
    const obj = JSON.parse(json)
    // Reconstruct CRDT objects from serialized data
    // Implementation details...
    return obj as DAWProjectCRDT
  }
}

// Delta/Patch Types for Efficient Synchronization

export interface CRDTDelta {
  type: 'track_added' | 'region_added' | 'region_moved' | 'volume_changed' | 'effect_added'
  projectId: string
  userId: string
  timestamp: VectorClock
  data: any
}

export class CRDTSyncManager {
  private project: DAWProjectCRDT
  private pendingDeltas: CRDTDelta[] = []
  private onDeltaCallback?: (delta: CRDTDelta) => void
  
  constructor(project: DAWProjectCRDT) {
    this.project = project
  }
  
  generateDelta(operation: string, data: any, userId: string): CRDTDelta {
    const timestamp = new VectorClock()
    timestamp.increment(userId)
    
    return {
      type: operation as any,
      projectId: this.project.id,
      userId,
      timestamp,
      data
    }
  }
  
  applyDelta(delta: CRDTDelta): void {
    // Apply delta to local project state
    switch (delta.type) {
      case 'region_added':
        // Implementation...
        break
      case 'volume_changed':
        // Implementation...
        break
      // ... other cases
    }
    
    if (this.onDeltaCallback) {
      this.onDeltaCallback(delta)
    }
  }
  
  onDelta(callback: (delta: CRDTDelta) => void): void {
    this.onDeltaCallback = callback
  }
}
