// Shared TypeScript types for SyncSphere microservices

import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash?: string;
  profile: UserProfile;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfile {
  role?: 'user' | 'admin' | 'moderator';
  musicalPreferences?: MusicalPreferences;
  bio?: string;
  avatar?: string;
}

export interface MusicalPreferences {
  genres: string[];
  instruments: string[];
  experience: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  collaborationStyle: 'leader' | 'follower' | 'flexible';
  preferredTempo: {
    min: number;
    max: number;
  };
  preferredKeys: string[];
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: Date;
  metadata: Record<string, any>;
  created_at: Date;
}

export interface CollaborationRoom {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  settings: RoomSettings;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RoomSettings {
  maxParticipants: number;
  isPublic: boolean;
  requiresApproval: boolean;
  allowFileUpload: boolean;
  allowRecording: boolean;
  genre?: string;
  targetTempo?: number;
  targetKey?: string;
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: 'creator' | 'moderator' | 'participant';
  joined_at: Date;
  last_active: Date;
}

export interface AudioFile {
  _id: string;
  userId: string;
  originalName: string;
  filename: string;
  filepath: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed';
  analysisId?: string;
  error?: string;
}

export interface AudioAnalysis {
  _id: string;
  fileId: string;
  userId: string;
  features: AudioFeatures;
  createdAt: Date;
}

export interface AudioFeatures {
  duration: number;
  sampleRate: number;
  bitRate: number;
  tempo: number;
  timeSignature: string;
  key: string;
  energy: number;
  loudness: number;
  spectralCentroid: number;
  spectralBandwidth: number;
  mfcc: number[];
  chroma: number[];
  harmonicComplexity: number;
  rhythmicComplexity: number;
  extractedAt: Date;
}

export interface AudioProcessingJob {
  id: string;
  user_id: string;
  file_path: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: Record<string, any>;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserCompatibility {
  id: string;
  user_id_1: string;
  user_id_2: string;
  compatibility_score: number;
  factors: CompatibilityFactors;
  calculated_at: Date;
}

export interface CompatibilityFactors {
  musicalTaste: number;
  experienceLevel: number;
  collaborationStyle: number;
  temporalAlignment: number;
  harmonicAlignment: number;
  genreOverlap: number;
}

export interface RecommendationResult {
  id: string;
  type: 'room' | 'user' | 'collaboration';
  score: number;
  reasons: string[];
  metadata: Record<string, any>;
}

export interface KafkaEvent {
  eventType: string;
  data: Record<string, any>;
  timestamp: string;
  service: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  error?: string;
  services?: {
    postgres: boolean;
    mongodb: boolean;
    redis: boolean;
    kafka?: boolean;
  };
}

export interface RoomState {
  id: string;
  participants: Map<string, ParticipantState>;
  currentTrack: string | null;
  playbackPosition: number;
  isPlaying: boolean;
  queue: QueueItem[];
  messages: RoomMessage[];
}

export interface ParticipantState {
  id: string;
  username: string;
  socketId: string;
  joinedAt: Date;
  isOnline: boolean;
  role: string;
}

export interface QueueItem {
  id: string;
  fileId: string;
  filename: string;
  duration: number;
  addedBy: string;
  addedAt: Date;
}

export interface RoomMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  type: 'text' | 'system' | 'audio' | 'file';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PlaybackSyncData {
  trackId?: string;
  position?: number;
  isPlaying?: boolean;
  action: 'play' | 'pause' | 'seek' | 'track_change';
}

// Express Request extensions
export interface AuthenticatedRequest extends Request {
  user?: User;
  sessionId?: string;
  sessionToken?: string;
}

// Base request type for controllers
export interface BaseRequest extends Request {
  body: any;
  params: any;
  query: any;
}

// Database connection configuration
export interface DatabaseConfig {
  postgres: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
  mongodb: {
    uri: string;
    database: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  kafka: {
    brokers: string[];
    clientId: string;
  };
}

// Service configuration
export interface ServiceConfig {
  port: number;
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  corsOrigin: string;
  jwtSecret: string;
  database: DatabaseConfig;
}
