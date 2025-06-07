// Shared TypeScript types for SyncSphere microservices

import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash?: string;
  profile: UserProfile;
  created_at: Date;
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
  _id?: string;
  id?: string; // Added for database compatibility
  userId: string;
  user_id?: string; // Added for database compatibility  
  originalName: string;
  original_name?: string; // Added for database compatibility
  filename: string;
  filepath: string;
  file_path?: string; // Added for database compatibility
  size: number;
  file_size?: number; // Added for database compatibility
  mimeType: string;
  mime_type?: string; // Added for database compatibility
  uploadedAt: Date;
  created_at?: Date; // Added for database compatibility
  updated_at?: Date; // Added for database compatibility
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed';
  analysisId?: string;
  error?: string;
  // Additional audio properties
  duration?: number;
  sample_rate?: number;
  channels?: number;
  bit_rate?: number;
  format?: string;
  is_processed?: boolean;
}

export interface AudioAnalysis {
  _id?: string;
  id?: string; // Added for database compatibility
  fileId: string;
  file_id?: string; // Added for database compatibility
  userId: string;
  features: AudioFeatures;
  createdAt: Date;
  created_at?: Date; // Added for database compatibility
  updated_at?: Date; // Added for database compatibility
  // Additional analysis properties
  duration?: number;
  sample_rate?: number;
  channels?: number;
  bit_rate?: number;
  codec?: string;
  format?: string;
  size?: number;
  analyzed_at?: Date;
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

export interface AudioMixingSettings {
  volumes: { [trackId: string]: number };
  effects: { [trackId: string]: string[] };
  masterVolume: number;
  masterEffects: string[];
  fadeIn: number;
  fadeOut: number;
  crossfade: number;
  outputFormat: string;
  format?: string; // Added for compatibility
  bitrate: number;
  sampleRate: number;
  codec?: string; // Added for compatibility
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

// Session-related types
export interface Session {
  id: string;
  roomId: string;
  name: string;
  createdBy: string;
  creatorId: string; // Added for database compatibility
  status: SessionState;
  state: any; // Added for database compatibility
  settings: SessionSettings;
  participants: SessionParticipant[];
  currentTrack?: string;
  playbackPosition: number;
  isPlaying: boolean;
  isActive: boolean; // Added for database compatibility
  lastActivity: Date; // Added for database compatibility
  createdAt: Date;
  updatedAt: Date;
}

export enum SessionState {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended'
}

export interface SessionSettings {
  allowGuestControl: boolean;
  maxParticipants: number;
  autoPlay: boolean;
  crossfade: boolean;
  volume: number;
  requireApproval?: boolean; // Added for compatibility with CreateSessionRequest
}

export interface SessionParticipant {
  userId: string;
  username: string;
  role: 'host' | 'moderator' | 'participant';
  joinedAt: Date;
  isActive: boolean;
  permissions: string[];
}

export interface SessionEvent {
  type: 'play' | 'pause' | 'skip' | 'seek' | 'volume' | 'join' | 'leave';
  sessionId: string;
  userId: string;
  data: any;
  timestamp: Date;
}

export interface CreateSessionRequest {
  roomId: string;
  name: string;
  settings?: Partial<SessionSettings>;
  maxParticipants?: number;
  allowGuestControl?: boolean;
  requireApproval?: boolean;
  autoPlay?: boolean;
}

export interface UpdateSessionRequest {
  name?: string;
  settings?: Partial<SessionSettings>;
  status?: SessionState;
  isActive?: boolean;
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

// Recommendation Service specific types
export interface RoomRecommendation {
  room: CollaborationRoom;
  compatibilityScore: number;
  compatibilityFactors: {
    musicalStyle: number;
    instrumentMatch: number;
    genreMatch: number;
    tempoCompatibility: number;
    experienceLevel: number;
  };
  explanation: string[];
}

export interface UserRecommendation {
  userId: string;
  username: string;
  compatibilityScore: number;
  sharedInterests: string[];
  complementarySkills: string[];
  musicalSynergy: number;
  profile: UserProfile;
}

export interface RecommendationRequest {
  userId: string;
  type: 'rooms' | 'users' | 'collaborators';
  limit?: number;
  filters?: RecommendationFilters;
}

export interface RecommendationFilters {
  genres?: string[];
  instruments?: string[];
  experienceLevel?: string[];
  minCompatibilityScore?: number;
  excludeExistingConnections?: boolean;
}

export interface MusicalCompatibilityScore {
  overall: number;
  factors: {
    genreAlignment: number;
    instrumentCompatibility: number;
    tempoAlignment: number;
    experienceBalance: number;
    collaborationStyleMatch: number;
    audioFeaturesSimilarity: number;
  };
  details: string[];
}

export interface MLModelPrediction {
  collaborationSuccess: number;
  musicalSynergy: number;
  longTermCompatibility: number;
  confidence: number;
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
