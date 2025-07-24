/**
 * Interface for managing WebSocket connections
 */
export interface IConnectionManager {
  addConnection(socket: any): Connection;
  removeConnection(socketId: string): void;
  getConnection(socketId: string): Connection | undefined;
  getConnectionsByUserId(userId: string): Connection[];
  getAllConnections(): Connection[];
  getConnectionCount(): number;
}

/**
 * Interface for managing room memberships and communication
 */
export interface IRoomManager {
  getRoom(roomId: string): Promise<RoomInfo | undefined>;
  addUserToRoom(roomId: string, userId: string, socketId: string): Promise<void>;
  removeUserFromRoom(roomId: string, userId: string, socketId: string): Promise<void>;
  getRoomParticipants(roomId: string): Promise<RoomParticipant[]>;
  broadcastToRoom(roomId: string, event: string, data: any, excludeSocketId?: string): Promise<void>;
}

/**
 * Interface for WebSocket authentication
 */
export interface IWebSocketAuthService {
  validateToken(token: string): Promise<AuthenticatedUser>;
  refreshToken(refreshToken: string): Promise<{ accessToken: string }>;
}

/**
 * Connection information
 */
export interface Connection {
  socketId: string;
  userId: string;
  username: string;
  connectedAt: Date;
  lastActivity: Date;
  rooms: Set<string>;
  metadata: Record<string, any>;
}

/**
 * Room information
 */
export interface RoomInfo {
  id: string;
  name: string;
  isActive: boolean;
  participantCount: number;
  maxParticipants: number;
  currentTrack?: {
    fileId: string;
    filename: string;
    position: number;
    isPlaying: boolean;
  };
}

/**
 * Room participant information
 */
export interface RoomParticipant {
  userId: string;
  username: string;
  socketId: string;
  joinedAt: Date;
  role: 'owner' | 'moderator' | 'participant';
  isActive: boolean;
}

/**
 * Authenticated user for WebSocket
 */
export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: string;
}
