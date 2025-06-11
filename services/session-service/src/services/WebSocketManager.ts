import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { createLogger } from '../utils/logger';
import DatabaseManager from '../../../shared/config/database';
import { CollaborationRoom, RoomParticipant, RoomMessage, PlaybackSyncData, User } from '../../../shared/types';
import EventPublisher from './EventPublisher';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('WebSocketManager');

interface ConnectedClient {
  userId: string;
  username: string;
  socketId: string;
  currentRoom?: string;
  lastActivity: Date;
}

interface RoomState {
  id: string;
  participants: Map<string, ConnectedClient>;
  currentTrack?: string;
  playbackPosition: number;
  isPlaying: boolean;
  queue: string[];
  lastSync: Date;
}

export class WebSocketManager {
  private io: SocketIOServer;
  private connectedClients: Map<string, ConnectedClient> = new Map();
  private activeRooms: Map<string, RoomState> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.startPeriodicCleanup();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info('New WebSocket connection', { socketId: socket.id });

      // Authentication
      socket.on('authenticate', async (data: { token: string }) => {
        try {
          await this.authenticateSocket(socket, data.token);
        } catch (error) {
          logger.error('Socket authentication failed', { socketId: socket.id, error });
          socket.emit('auth_error', { message: 'Authentication failed' });
          socket.disconnect();
        }
      });

      // Room Management
      socket.on('join_room', async (data: { roomId: string }) => {
        await this.handleJoinRoom(socket, data.roomId);
      });

      socket.on('leave_room', async (data: { roomId: string }) => {
        await this.handleLeaveRoom(socket, data.roomId);
      });

      // Real-time Collaboration
      socket.on('playback_sync', async (data: PlaybackSyncData) => {
        await this.handlePlaybackSync(socket, data);
      });

      socket.on('chat_message', async (data: { roomId: string; message: string }) => {
        await this.handleChatMessage(socket, data);
      });

      socket.on('audio_upload', async (data: { roomId: string; fileId: string; fileName: string }) => {
        await this.handleAudioUpload(socket, data);
      });

      socket.on('track_queue_update', async (data: { roomId: string; queue: string[] }) => {
        await this.handleQueueUpdate(socket, data);
      });

      socket.on('room_settings_update', async (data: { roomId: string; settings: any }) => {
        await this.handleRoomSettingsUpdate(socket, data);
      });

      // Activity tracking
      socket.on('user_activity', () => {
        this.updateUserActivity(socket.id);
      });

      // Disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Error handling
      socket.on('error', (error) => {
        logger.error('Socket error', { socketId: socket.id, error });
      });
    });
  }

  private async authenticateSocket(socket: Socket, token: string): Promise<void> {
    try {
      // Verify JWT token using shared auth middleware
      const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET) as any;
      
      // Get user from database
      const userResult = await DatabaseManager.executeQuery<User>(
        'SELECT id, email, username, profile FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];
      
      const client: ConnectedClient = {
        userId: user.id,
        username: user.username,
        socketId: socket.id,
        lastActivity: new Date()
      };

      this.connectedClients.set(socket.id, client);
      
      socket.emit('authenticated', {
        userId: user.id,
        username: user.username
      });

      logger.info('Socket authenticated successfully', {
        socketId: socket.id,
        userId: user.id,
        username: user.username
      });

      // Publish user online event
      await EventPublisher.publishUserEvent(user.id, 'online', {
        socketId: socket.id,
        timestamp: new Date()
      });

    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  private async handleJoinRoom(socket: Socket, roomId: string): Promise<void> {
    try {
      const client = this.connectedClients.get(socket.id);
      if (!client) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Verify room exists and user has access
      const roomResult = await DatabaseManager.executeQuery<CollaborationRoom>(
        'SELECT * FROM collaboration_rooms WHERE id = $1 AND is_active = true',
        [roomId]
      );

      if (roomResult.rows.length === 0) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const room = roomResult.rows[0];

      // Check if user is already a participant or if room allows new participants
      const participantResult = await DatabaseManager.executeQuery<RoomParticipant>(
        'SELECT * FROM room_participants WHERE room_id = $1 AND user_id = $2',
        [roomId, client.userId]
      );

      if (participantResult.rows.length === 0) {
        // Check room capacity
        const currentParticipants = await DatabaseManager.executeQuery(
          'SELECT COUNT(*) as count FROM room_participants WHERE room_id = $1',
          [roomId]
        );

        if (currentParticipants.rows[0].count >= room.settings.maxParticipants) {
          socket.emit('error', { message: 'Room is full' });
          return;
        }

        // Add user as participant
        await DatabaseManager.executeQuery(
          `INSERT INTO room_participants (id, room_id, user_id, role, joined_at, last_active) 
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [uuidv4(), roomId, client.userId, 'participant']
        );
      }

      // Join socket room
      socket.join(roomId);
      client.currentRoom = roomId;

      // Initialize or update room state
      if (!this.activeRooms.has(roomId)) {
        this.activeRooms.set(roomId, {
          id: roomId,
          participants: new Map(),
          playbackPosition: 0,
          isPlaying: false,
          queue: [],
          lastSync: new Date()
        });
      }

      const roomState = this.activeRooms.get(roomId)!;
      roomState.participants.set(client.userId, client);

      // Update last active time
      await DatabaseManager.executeQuery(
        'UPDATE room_participants SET last_active = NOW() WHERE room_id = $1 AND user_id = $2',
        [roomId, client.userId]
      );

      // Notify other participants
      socket.to(roomId).emit('user_joined', {
        userId: client.userId,
        username: client.username,
        timestamp: new Date()
      });

      // Send current room state to the joining user
      socket.emit('room_joined', {
        roomId,
        roomState: {
          participants: Array.from(roomState.participants.values()).map(p => ({
            userId: p.userId,
            username: p.username
          })),
          currentTrack: roomState.currentTrack,
          playbackPosition: roomState.playbackPosition,
          isPlaying: roomState.isPlaying,
          queue: roomState.queue
        }
      });

      logger.info('User joined room', { roomId, userId: client.userId, username: client.username });

      // Publish room event
      await EventPublisher.publishRoomEvent(roomId, 'user_joined', {
        userId: client.userId,
        username: client.username
      }, client.userId);

    } catch (error) {
      logger.error('Failed to join room', { roomId, error });
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  private async handleLeaveRoom(socket: Socket, roomId: string): Promise<void> {
    try {
      const client = this.connectedClients.get(socket.id);
      if (!client || client.currentRoom !== roomId) {
        return;
      }

      socket.leave(roomId);
      client.currentRoom = undefined;

      const roomState = this.activeRooms.get(roomId);
      if (roomState) {
        roomState.participants.delete(client.userId);

        // Clean up empty rooms
        if (roomState.participants.size === 0) {
          this.activeRooms.delete(roomId);
        }
      }

      // Notify other participants
      socket.to(roomId).emit('user_left', {
        userId: client.userId,
        username: client.username,
        timestamp: new Date()
      });

      socket.emit('room_left', { roomId });

      logger.info('User left room', { roomId, userId: client.userId, username: client.username });

      // Publish room event
      await EventPublisher.publishRoomEvent(roomId, 'user_left', {
        userId: client.userId,
        username: client.username
      }, client.userId);

    } catch (error) {
      logger.error('Failed to leave room', { roomId, error });
    }
  }

  private async handlePlaybackSync(socket: Socket, data: PlaybackSyncData): Promise<void> {
    try {
      const client = this.connectedClients.get(socket.id);
      if (!client || !client.currentRoom) {
        return;
      }

      const roomState = this.activeRooms.get(client.currentRoom);
      if (!roomState) {
        return;
      }

      // Update room state based on sync data
      if (data.trackId !== undefined) {
        roomState.currentTrack = data.trackId;
      }
      if (data.position !== undefined) {
        roomState.playbackPosition = data.position;
      }
      if (data.isPlaying !== undefined) {
        roomState.isPlaying = data.isPlaying;
      }
      roomState.lastSync = new Date();

      // Broadcast sync to all participants except sender
      socket.to(client.currentRoom).emit('playback_sync', {
        ...data,
        senderId: client.userId,
        timestamp: new Date()
      });

      logger.debug('Playback sync', {
        roomId: client.currentRoom,
        userId: client.userId,
        action: data.action
      });

      // Publish audio event
      await EventPublisher.publishAudioEvent('playback_sync', {
        ...data,
        senderId: client.userId
      }, client.userId, client.currentRoom);

    } catch (error) {
      logger.error('Failed to handle playback sync', { error });
    }
  }

  private async handleChatMessage(socket: Socket, data: { roomId: string; message: string }): Promise<void> {
    try {
      const client = this.connectedClients.get(socket.id);
      if (!client || client.currentRoom !== data.roomId) {
        socket.emit('error', { message: 'Not in specified room' });
        return;
      }

      // Save message to database
      const messageId = uuidv4();
      await DatabaseManager.executeQuery(
        `INSERT INTO room_messages (id, room_id, user_id, username, message, type, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [messageId, data.roomId, client.userId, client.username, data.message, 'text']
      );

      const messageData: RoomMessage = {
        id: messageId,
        userId: client.userId,
        username: client.username,
        message: data.message,
        type: 'text',
        timestamp: new Date()
      };

      // Broadcast to all participants in the room
      this.io.to(data.roomId).emit('chat_message', messageData);

      logger.info('Chat message sent', {
        roomId: data.roomId,
        userId: client.userId,
        messageLength: data.message.length
      });

      // Publish room event
      await EventPublisher.publishRoomEvent(data.roomId, 'chat_message', messageData, client.userId);

    } catch (error) {
      logger.error('Failed to handle chat message', { error });
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async handleAudioUpload(socket: Socket, data: { roomId: string; fileId: string; fileName: string }): Promise<void> {
    try {
      const client = this.connectedClients.get(socket.id);
      if (!client || client.currentRoom !== data.roomId) {
        return;
      }

      // Notify all participants about the new audio file
      const uploadData = {
        fileId: data.fileId,
        fileName: data.fileName,
        uploadedBy: {
          userId: client.userId,
          username: client.username
        },
        timestamp: new Date()
      };

      this.io.to(data.roomId).emit('audio_uploaded', uploadData);

      logger.info('Audio upload notification sent', {
        roomId: data.roomId,
        fileId: data.fileId,
        userId: client.userId
      });

      // Publish room event
      await EventPublisher.publishRoomEvent(data.roomId, 'audio_uploaded', uploadData, client.userId);

    } catch (error) {
      logger.error('Failed to handle audio upload notification', { error });
    }
  }

  private async handleQueueUpdate(socket: Socket, data: { roomId: string; queue: string[] }): Promise<void> {
    try {
      const client = this.connectedClients.get(socket.id);
      if (!client || client.currentRoom !== data.roomId) {
        return;
      }

      const roomState = this.activeRooms.get(data.roomId);
      if (roomState) {
        roomState.queue = data.queue;
      }

      // Broadcast queue update to all participants except sender
      socket.to(data.roomId).emit('queue_updated', {
        queue: data.queue,
        updatedBy: {
          userId: client.userId,
          username: client.username
        },
        timestamp: new Date()
      });

      logger.info('Queue updated', {
        roomId: data.roomId,
        userId: client.userId,
        queueLength: data.queue.length
      });

      // Publish room event
      await EventPublisher.publishRoomEvent(data.roomId, 'queue_updated', {
        queue: data.queue,
        updatedBy: client.userId
      }, client.userId);

    } catch (error) {
      logger.error('Failed to handle queue update', { error });
    }
  }

  private async handleRoomSettingsUpdate(socket: Socket, data: { roomId: string; settings: any }): Promise<void> {
    try {
      const client = this.connectedClients.get(socket.id);
      if (!client || client.currentRoom !== data.roomId) {
        return;
      }

      // Check if user has permission to update room settings
      const participantResult = await DatabaseManager.executeQuery<RoomParticipant>(
        'SELECT role FROM room_participants WHERE room_id = $1 AND user_id = $2',
        [data.roomId, client.userId]
      );

      if (participantResult.rows.length === 0 || 
          !['creator', 'moderator'].includes(participantResult.rows[0].role)) {
        socket.emit('error', { message: 'Insufficient permissions' });
        return;
      }

      // Update room settings in database
      await DatabaseManager.executeQuery(
        'UPDATE collaboration_rooms SET settings = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(data.settings), data.roomId]
      );

      // Broadcast settings update to all participants
      this.io.to(data.roomId).emit('room_settings_updated', {
        settings: data.settings,
        updatedBy: {
          userId: client.userId,
          username: client.username
        },
        timestamp: new Date()
      });

      logger.info('Room settings updated', {
        roomId: data.roomId,
        userId: client.userId
      });

      // Publish room event
      await EventPublisher.publishRoomEvent(data.roomId, 'settings_updated', {
        settings: data.settings,
        updatedBy: client.userId
      }, client.userId);

    } catch (error) {
      logger.error('Failed to handle room settings update', { error });
    }
  }

  private updateUserActivity(socketId: string): void {
    const client = this.connectedClients.get(socketId);
    if (client) {
      client.lastActivity = new Date();
    }
  }

  private handleDisconnect(socket: Socket): void {
    const client = this.connectedClients.get(socket.id);
    if (!client) {
      return;
    }

    logger.info('User disconnected', {
      socketId: socket.id,
      userId: client.userId,
      username: client.username
    });

    // Leave current room if any
    if (client.currentRoom) {
      const roomState = this.activeRooms.get(client.currentRoom);
      if (roomState) {
        roomState.participants.delete(client.userId);
        
        // Notify other participants
        socket.to(client.currentRoom).emit('user_left', {
          userId: client.userId,
          username: client.username,
          timestamp: new Date()
        });

        // Clean up empty rooms
        if (roomState.participants.size === 0) {
          this.activeRooms.delete(client.currentRoom);
        }
      }
    }

    // Remove from connected clients
    this.connectedClients.delete(socket.id);

    // Publish user offline event
    EventPublisher.publishUserEvent(client.userId, 'offline', {
      socketId: socket.id,
      timestamp: new Date()
    }).catch(error => {
      logger.error('Failed to publish user offline event', { error });
    });
  }
  private startPeriodicCleanup(): void {
    // Clean up inactive clients every 5 minutes
    setInterval(() => {
      const now = new Date();
      const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

      Array.from(this.connectedClients.entries()).forEach(([socketId, client]) => {
        if (now.getTime() - client.lastActivity.getTime() > inactiveThreshold) {
          logger.info('Cleaning up inactive client', {
            socketId,
            userId: client.userId,
            lastActivity: client.lastActivity
          });

          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.disconnect();
          } else {
            // Socket already disconnected, just clean up our records
            this.connectedClients.delete(socketId);
          }
        }
      });
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  // Public methods for external use
  public getConnectedUsers(): ConnectedClient[] {
    return Array.from(this.connectedClients.values());
  }

  public getRoomParticipants(roomId: string): ConnectedClient[] {
    const roomState = this.activeRooms.get(roomId);
    if (!roomState) {
      return [];
    }
    return Array.from(roomState.participants.values());
  }

  public isUserConnected(userId: string): boolean {
    return Array.from(this.connectedClients.values()).some(client => client.userId === userId);
  }

  public async notifyUser(userId: string, event: string, data: any): Promise<void> {
    const client = Array.from(this.connectedClients.values()).find(c => c.userId === userId);
    if (client) {
      const socket = this.io.sockets.sockets.get(client.socketId);
      if (socket) {
        socket.emit(event, data);
      }
    }
  }

  public async notifyRoom(roomId: string, event: string, data: any): Promise<void> {
    this.io.to(roomId).emit(event, data);
  }

  public getStats(): any {
    return {
      connectedClients: this.connectedClients.size,
      activeRooms: this.activeRooms.size,
      totalParticipants: Array.from(this.activeRooms.values())
        .reduce((sum, room) => sum + room.participants.size, 0)
    };
  }
}
