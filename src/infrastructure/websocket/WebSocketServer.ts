import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { injectable, inject } from 'inversify';
import { ConnectionManager } from './ConnectionManager';
import { RoomManager } from './RoomManager';
import type { IEventBus, EventHandler } from '../../application/interfaces/IEventBus';
import { IWebSocketAuthService } from './interfaces';
import { AudioPlaybackSyncedEvent, UserJoinedRoomEvent, UserLeftRoomEvent } from '../../domain/events/RoomEvents';
import { AudioAnalyzedEvent } from '../../domain/events/AudioEvents';
import { TYPES } from '../container/types';

/**
 * WebSocket server with clean architecture
 * Handles real-time communication with loose coupling through events
 */
@injectable()
export class WebSocketServer {
  private io!: SocketIOServer; // Use definite assignment assertion
  private connectionManager: ConnectionManager;
  private roomManager: RoomManager;

  constructor(
    @inject(TYPES.EventBus) private readonly eventBus: IEventBus,
    @inject(TYPES.Logger) private readonly logger?: any
  ) {
    this.connectionManager = new ConnectionManager();
    this.roomManager = new RoomManager(eventBus, logger);
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server: HTTPServer, authService: IWebSocketAuthService): void {
    this.io = new SocketIOServer(server, this.getSocketConfig());
    
    // Set room manager's socket server reference
    this.roomManager.setSocketServer(this.io);
    
    this.setupAuthentication(authService);
    this.setupEventHandlers();
    this.subscribeToEvents();
    
    this.logger?.info('WebSocket server initialized');
  }

  /**
   * Get Socket.IO configuration
   */
  private getSocketConfig() {
    return {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true
      },
      transports: ['websocket', 'polling'] as ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    };
  }

  /**
   * Setup authentication middleware
   */
  private setupAuthentication(authService: IWebSocketAuthService): void {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
        
        if (!token) {
          throw new Error('Authentication token required');
        }

        const user = await authService.validateToken(token);
        socket.data.user = user;
        
        this.logger?.info(`WebSocket authentication successful for user: ${user.id}`);
        next();
      } catch (error: any) {
        this.logger?.warn(`WebSocket authentication failed: ${error?.message || 'Unknown error'}`);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const connection = this.connectionManager.addConnection(socket);
      this.logger?.info(`New WebSocket connection: ${socket.id} for user: ${connection.userId}`);

      // Handle room operations
      socket.on('join_room', async (data) => {
        await this.handleJoinRoom(socket, data);
      });

      socket.on('leave_room', async (data) => {
        await this.handleLeaveRoom(socket, data);
      });

      // Handle audio playback sync
      socket.on('playback_sync', async (data) => {
        await this.handlePlaybackSync(socket, data);
      });

      socket.on('playback_seek', async (data) => {
        await this.handlePlaybackSeek(socket, data);
      });

      socket.on('playback_play', async (data) => {
        await this.handlePlaybackPlay(socket, data);
      });

      socket.on('playback_pause', async (data) => {
        await this.handlePlaybackPause(socket, data);
      });

      // Handle chat messages
      socket.on('chat_message', async (data) => {
        await this.handleChatMessage(socket, data);
      });

      // Handle file sharing
      socket.on('share_file', async (data) => {
        await this.handleShareFile(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, reason);
      });

      // Update activity on any event
      socket.onAny(() => {
        this.connectionManager.updateActivity(socket.id);
      });
    });
  }

  /**
   * Subscribe to domain events
   */
  private subscribeToEvents(): void {
    // Room events
    this.eventBus.subscribe('room.user_joined', new RoomJoinedEventHandler(this.io));
    this.eventBus.subscribe('room.user_left', new RoomLeftEventHandler(this.io));
    
    // Audio events
    this.eventBus.subscribe('audio.playback_synced', new PlaybackSyncEventHandler(this.io));
    this.eventBus.subscribe('audio.analyzed', new AudioAnalyzedEventHandler(this.io));
  }

  /**
   * Handle join room request
   */
  private async handleJoinRoom(socket: Socket, data: { roomId: string }): Promise<void> {
    try {
      const { roomId } = data;
      const userId = socket.data.user.id;

      await this.roomManager.addUserToRoom(roomId, userId, socket.id);
      this.connectionManager.addToRoom(socket.id, roomId);

      // Send room info to user
      const room = await this.roomManager.getRoom(roomId);
      const participants = await this.roomManager.getRoomParticipants(roomId);

      socket.emit('room_joined', {
        room,
        participants,
        userId
      });

      this.logger?.info(`User ${userId} joined room ${roomId}`);
    } catch (error: any) {
      this.logger?.error(`Error joining room: ${error?.message || 'Unknown error'}`);
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  /**
   * Handle leave room request
   */
  private async handleLeaveRoom(socket: Socket, data: { roomId: string }): Promise<void> {
    try {
      const { roomId } = data;
      const userId = socket.data.user.id;

      await this.roomManager.removeUserFromRoom(roomId, userId, socket.id);
      this.connectionManager.removeFromRoom(socket.id, roomId);

      socket.emit('room_left', { roomId });
    } catch (error: any) {
      this.logger?.error(`Error leaving room: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle playback sync
   */
  private async handlePlaybackSync(socket: Socket, data: any): Promise<void> {
    try {
      const userId = socket.data.user.id;
      const event = new AudioPlaybackSyncedEvent({
        roomId: data.roomId,
        fileId: data.fileId,
        userId,
        position: data.position,
        isPlaying: data.isPlaying,
        timestamp: new Date()
      });

      await this.eventBus.publish(event);
    } catch (error: any) {
      this.logger?.error(`Error handling playback sync: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle playback seek
   */
  private async handlePlaybackSeek(socket: Socket, data: { roomId: string; position: number }): Promise<void> {
    const { roomId, position } = data;
    await this.roomManager.broadcastToRoom(roomId, 'playback_seek', { position, userId: socket.data.user.id }, socket.id);
  }

  /**
   * Handle playback play
   */
  private async handlePlaybackPlay(socket: Socket, data: { roomId: string; position: number }): Promise<void> {
    const { roomId, position } = data;
    await this.roomManager.broadcastToRoom(roomId, 'playback_play', { position, userId: socket.data.user.id }, socket.id);
  }

  /**
   * Handle playback pause
   */
  private async handlePlaybackPause(socket: Socket, data: { roomId: string; position: number }): Promise<void> {
    const { roomId, position } = data;
    await this.roomManager.broadcastToRoom(roomId, 'playback_pause', { position, userId: socket.data.user.id }, socket.id);
  }

  /**
   * Handle chat message
   */
  private async handleChatMessage(socket: Socket, data: { roomId: string; message: string }): Promise<void> {
    const { roomId, message } = data;
    const user = socket.data.user;

    const chatData = {
      userId: user.id,
      username: user.username,
      message,
      timestamp: new Date()
    };

    await this.roomManager.broadcastToRoom(roomId, 'chat_message', chatData);
  }

  /**
   * Handle file sharing
   */
  private async handleShareFile(socket: Socket, data: { roomId: string; fileId: string; fileName: string }): Promise<void> {
    const { roomId, fileId, fileName } = data;
    const user = socket.data.user;

    const shareData = {
      userId: user.id,
      username: user.username,
      fileId,
      fileName,
      timestamp: new Date()
    };

    await this.roomManager.broadcastToRoom(roomId, 'file_shared', shareData);
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(socket: Socket, reason: string): void {
    const connection = this.connectionManager.getConnection(socket.id);
    if (connection) {
      // Remove from all rooms
      for (const roomId of connection.rooms) {
        this.roomManager.removeUserFromRoom(roomId, connection.userId, socket.id);
      }
    }

    this.connectionManager.removeConnection(socket.id);
    this.logger?.info(`WebSocket disconnected: ${socket.id}, reason: ${reason}`);
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      connections: this.connectionManager.getConnectionCount(),
      rooms: this.roomManager.getRoomCount(),
      activeRooms: this.roomManager.getActiveRooms().length
    };
  }

  /**
   * Cleanup inactive connections and rooms
   */
  cleanup(): void {
    this.connectionManager.cleanupInactiveConnections();
    this.roomManager.cleanupInactiveRooms();
  }
}

/**
 * Event handlers for domain events
 */
class RoomJoinedEventHandler implements EventHandler<UserJoinedRoomEvent> {
  constructor(private io: SocketIOServer) {}

  async handle(event: UserJoinedRoomEvent): Promise<void> {
    this.io.to(event.data.roomId).emit('user_joined', {
      userId: event.data.userId,
      username: event.data.username,
      participantCount: event.data.participantCount
    });
  }
}

class RoomLeftEventHandler implements EventHandler<UserLeftRoomEvent> {
  constructor(private io: SocketIOServer) {}

  async handle(event: UserLeftRoomEvent): Promise<void> {
    this.io.to(event.data.roomId).emit('user_left', {
      userId: event.data.userId,
      username: event.data.username,
      participantCount: event.data.participantCount
    });
  }
}

class PlaybackSyncEventHandler implements EventHandler<AudioPlaybackSyncedEvent> {
  constructor(private io: SocketIOServer) {}

  async handle(event: AudioPlaybackSyncedEvent): Promise<void> {
    this.io.to(event.data.roomId).emit('playback_sync', event.data);
  }
}

class AudioAnalyzedEventHandler implements EventHandler<AudioAnalyzedEvent> {
  constructor(private io: SocketIOServer) {}

  async handle(event: AudioAnalyzedEvent): Promise<void> {
    // Notify user about completed analysis
    this.io.emit('audio_analyzed', {
      fileId: event.data.fileId,
      userId: event.data.userId,
      analysisId: event.data.analysisId,
      fileName: event.data.fileName
    });
  }
}
