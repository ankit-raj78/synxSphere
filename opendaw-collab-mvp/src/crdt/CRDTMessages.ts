// CRDTMessages.ts - WebSocket message types for CRDT synchronization

import { CRDTChange } from './BasicCRDT';

// Extend existing CollabMessage types with CRDT-specific messages
export interface CRDTDeltaMessage {
  type: 'CRDT_DELTA';
  projectId: string;
  userId: string;
  timestamp: number;
  data: {
    changes: CRDTChange[];
  };
}

export interface CRDTSyncRequestMessage {
  type: 'CRDT_SYNC_REQUEST';
  projectId: string;
  userId: string;
  timestamp: number;
  data: {
    lastKnownTimestamp: number;
  };
}

export interface CRDTSyncResponseMessage {
  type: 'CRDT_SYNC_RESPONSE';
  projectId: string;
  userId: string;
  timestamp: number;
  data: {
    changes: CRDTChange[];
    fullState?: any; // Full project state if too many changes
  };
}

export interface CRDTRegionAddedMessage {
  type: 'CRDT_REGION_ADDED';
  projectId: string;
  userId: string;
  timestamp: number;
  data: {
    regionId: string;
    trackId: string;
    fileName: string;
    startTime: number;
    endTime: number;
    volume: number;
    pan: number;
    color: string;
  };
}

export interface CRDTRegionUpdatedMessage {
  type: 'CRDT_REGION_UPDATED';
  projectId: string;
  userId: string;
  timestamp: number;
  data: {
    regionId: string;
    field: 'startTime' | 'endTime' | 'volume' | 'pan' | 'color';
    value: any;
  };
}

export interface CRDTRegionDeletedMessage {
  type: 'CRDT_REGION_DELETED';
  projectId: string;
  userId: string;
  timestamp: number;
  data: {
    regionId: string;
  };
}

export type CRDTMessage = 
  | CRDTDeltaMessage
  | CRDTSyncRequestMessage  
  | CRDTSyncResponseMessage
  | CRDTRegionAddedMessage
  | CRDTRegionUpdatedMessage
  | CRDTRegionDeletedMessage;

// Helper functions to create messages
export function createCRDTDelta(
  projectId: string,
  userId: string,
  changes: CRDTChange[]
): CRDTDeltaMessage {
  return {
    type: 'CRDT_DELTA',
    projectId,
    userId,
    timestamp: Date.now(),
    data: { changes }
  };
}

export function createCRDTSyncRequest(
  projectId: string,
  userId: string,
  lastKnownTimestamp: number
): CRDTSyncRequestMessage {
  return {
    type: 'CRDT_SYNC_REQUEST',
    projectId,
    userId,
    timestamp: Date.now(),
    data: { lastKnownTimestamp }
  };
}

export function createCRDTSyncResponse(
  projectId: string,
  userId: string,
  changes: CRDTChange[],
  fullState?: any
): CRDTSyncResponseMessage {
  return {
    type: 'CRDT_SYNC_RESPONSE',
    projectId,
    userId,
    timestamp: Date.now(),
    data: { changes, fullState }
  };
}

export function createCRDTRegionAdded(
  projectId: string,
  userId: string,
  regionData: {
    regionId: string;
    trackId: string;
    fileName: string;
    startTime: number;
    endTime: number;
    volume: number;
    pan: number;
    color: string;
  }
): CRDTRegionAddedMessage {
  return {
    type: 'CRDT_REGION_ADDED',
    projectId,
    userId,
    timestamp: Date.now(),
    data: regionData
  };
}

export function createCRDTRegionUpdated(
  projectId: string,
  userId: string,
  regionId: string,
  field: 'startTime' | 'endTime' | 'volume' | 'pan' | 'color',
  value: any
): CRDTRegionUpdatedMessage {
  return {
    type: 'CRDT_REGION_UPDATED',
    projectId,
    userId,
    timestamp: Date.now(),
    data: { regionId, field, value }
  };
}

export function createCRDTRegionDeleted(
  projectId: string,
  userId: string,
  regionId: string
): CRDTRegionDeletedMessage {
  return {
    type: 'CRDT_REGION_DELETED',
    projectId,
    userId,
    timestamp: Date.now(),
    data: { regionId }
  };
}
