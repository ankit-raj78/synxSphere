export interface CollabMessage {
  type: CollabMessageType
  projectId: string
  userId: string
  timestamp: number
  data: any
}

export type CollabMessageType = 
  | 'USER_JOIN'
  | 'USER_LEAVE'
  | 'BOX_CREATED'
  | 'BOX_UPDATED'
  | 'BOX_DELETED'
  | 'BOX_OWNERSHIP_CLAIMED'
  | 'BOX_OWNERSHIP_RELEASED'
  | 'BOX_LOCKED'
  | 'BOX_UNLOCKED'
  | 'DRAG_TRACK'
  | 'UPDATE_TRACK'
  | 'SAMPLE_SYNC'
  | 'PROJECT_SAVED'
  | 'PROJECT_LOADED'
  | 'SYNC_REQUEST'
  | 'SYNC_RESPONSE'
  | 'ERROR'
  // Timeline-specific operations
  | 'CLIP_CREATED'
  | 'CLIP_DELETED'
  | 'CLIP_MOVED'
  | 'CLIP_RESIZED'
  | 'REGION_CREATED'
  | 'REGION_DELETED'
  | 'REGION_MOVED'
  | 'REGION_RESIZED'
  | 'TIMELINE_CHANGE'
  // Update system messages
  | 'TIMELINE_UPDATE'
  | 'TIMELINE_SNAPSHOT_REQUEST'
  | 'TIMELINE_SNAPSHOT_RESPONSE'

export interface UserJoinData {
  username?: string
  avatar?: string
}

export interface UserLeaveData {
  reason?: string
}

export interface BoxCreatedData {
  boxUuid: string
  boxType: string
  ownerId: string
}

export interface BoxUpdatedData {
  boxUuid: string
  field: string
  value: any
  path?: string
}

export interface BoxDeletedData {
  boxUuid: string
}

export interface BoxOwnershipData {
  boxUuid: string
  ownerId: string
}

export interface BoxLockData {
  boxUuid: string
  lockedBy: string
  expiresAt?: number
}

// Realtime track collaboration
export interface DragTrackData {
  trackId: string
  newIndex: number
}

export interface UpdateTrackData {
  track: any // Replace with proper TrackDTO when available
}

export interface SampleSyncData {
  sampleCount: number
}

export interface ProjectSavedData {
  projectData: Uint8Array
  version: number
}

export interface ProjectLoadedData {
  projectId: string
}

export interface SyncRequestData {
  since?: number
}

export interface SyncResponseData {
  ownership: Record<string, string>  // boxUuid -> ownerId
  locks: Record<string, string>      // boxUuid -> lockedBy
  activeUsers: string[]
  events?: CollabMessage[]           // optional event list for delta sync
}

export interface ErrorData {
  message: string
  code?: string
  details?: any
}

// Timeline-specific data interfaces
export interface ClipCreatedData {
  clipId: string
  trackId: string
  startTime: number
  duration: number
  sampleId?: string
}

export interface ClipDeletedData {
  clipId: string
  trackId: string
}

export interface ClipMovedData {
  clipId: string
  trackId: string
  newTrackId?: string
  startTime: number
}

export interface ClipResizedData {
  clipId: string
  trackId: string
  startTime: number
  duration: number
}

export interface RegionCreatedData {
  regionId: string
  trackId: string
  startTime: number
  duration: number
  sampleId?: string
}

export interface RegionDeletedData {
  regionId: string
  trackId: string
}

export interface RegionMovedData {
  regionId: string
  trackId: string
  newTrackId?: string
  startTime: number
}

export interface RegionResizedData {
  regionId: string
  trackId: string
  startTime: number
  duration: number
}

export interface TimelineChangeData {
  changeType: 'parameter' | 'property' | 'state'
  targetId: string
  targetType: 'clip' | 'region' | 'track'
  property: string
  value: any
}

// Type-safe message creators
export const createCollabMessage = {
  userJoin: (projectId: string, userId: string, data: UserJoinData): CollabMessage => ({
    type: 'USER_JOIN',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  userLeave: (projectId: string, userId: string, data: UserLeaveData): CollabMessage => ({
    type: 'USER_LEAVE',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  boxCreated: (projectId: string, userId: string, data: BoxCreatedData): CollabMessage => ({
    type: 'BOX_CREATED',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  boxUpdated: (projectId: string, userId: string, data: BoxUpdatedData): CollabMessage => ({
    type: 'BOX_UPDATED',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  boxDeleted: (projectId: string, userId: string, data: BoxDeletedData): CollabMessage => ({
    type: 'BOX_DELETED',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  boxOwnershipClaimed: (projectId: string, userId: string, data: BoxOwnershipData): CollabMessage => ({
    type: 'BOX_OWNERSHIP_CLAIMED',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  boxOwnershipReleased: (projectId: string, userId: string, data: BoxOwnershipData): CollabMessage => ({
    type: 'BOX_OWNERSHIP_RELEASED',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  boxLocked: (projectId: string, userId: string, data: BoxLockData): CollabMessage => ({
    type: 'BOX_LOCKED',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  boxUnlocked: (projectId: string, userId: string, data: BoxLockData): CollabMessage => ({
    type: 'BOX_UNLOCKED',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  dragTrack: (projectId: string, userId: string, data: DragTrackData): CollabMessage => ({
    type: 'DRAG_TRACK',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  updateTrack: (projectId: string, userId: string, data: UpdateTrackData): CollabMessage => ({
    type: 'UPDATE_TRACK',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  sampleSync: (projectId: string, userId: string, data: SampleSyncData): CollabMessage => ({
    type: 'SAMPLE_SYNC',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  syncRequest: (projectId: string, userId: string, data: SyncRequestData): CollabMessage => ({
    type: 'SYNC_REQUEST',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  syncResponse: (projectId: string, userId: string, data: SyncResponseData): CollabMessage => ({
    type: 'SYNC_RESPONSE',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  error: (projectId: string, userId: string, data: ErrorData): CollabMessage => ({
    type: 'ERROR',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  })
}

// Timeline Update System interfaces
export interface TimelineUpdateData {
  updates: Array<{
    type: string
    data: number[]
    debug?: string
  }>
}

export interface TimelineSnapshotRequestData {
  originalRequesterId?: string // 原始请求者ID（用于服务器转发）
}

export interface TimelineSnapshotResponseData {
  snapshot?: number[]  // BoxGraph 序列化数据（旧格式）
  updates?: any[]      // NewUpdate 数组（新格式）
  boxCount: number     // Box 总数
  requesterId?: string // 请求者ID（用于服务器转发）
}
