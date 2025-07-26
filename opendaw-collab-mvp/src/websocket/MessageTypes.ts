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
  | 'AUDIO_REGION_CREATED'
  | 'PROJECT_SAVED'
  | 'PROJECT_LOADED'
  | 'SYNC_REQUEST'
  | 'SYNC_RESPONSE'
  | 'ERROR'
  // CRDT message types
  | 'CRDT_DELTA'
  | 'CRDT_SYNC_REQUEST'
  | 'CRDT_SYNC_RESPONSE'
  | 'CRDT_REGION_ADDED'
  | 'CRDT_REGION_UPDATED'
  | 'CRDT_REGION_DELETED'

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
}

export interface ErrorData {
  message: string
  code?: string
  details?: any
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
  }),

  // CRDT message creators
  crdtDelta: (projectId: string, userId: string, data: any): CollabMessage => ({
    type: 'CRDT_DELTA',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  crdtSyncRequest: (projectId: string, userId: string, data: any): CollabMessage => ({
    type: 'CRDT_SYNC_REQUEST',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  crdtSyncResponse: (projectId: string, userId: string, data: any): CollabMessage => ({
    type: 'CRDT_SYNC_RESPONSE',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  crdtRegionAdded: (projectId: string, userId: string, data: any): CollabMessage => ({
    type: 'CRDT_REGION_ADDED',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  crdtRegionUpdated: (projectId: string, userId: string, data: any): CollabMessage => ({
    type: 'CRDT_REGION_UPDATED',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  crdtRegionDeleted: (projectId: string, userId: string, data: any): CollabMessage => ({
    type: 'CRDT_REGION_DELETED',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  }),

  audioRegionCreated: (projectId: string, userId: string, data: any): CollabMessage => ({
    type: 'AUDIO_REGION_CREATED',
    projectId,
    userId,
    timestamp: Date.now(),
    data
  })
}
