import { injectable, inject } from 'inversify';
import { IRoomManager, RoomInfo, RoomParticipant } from './interfaces';
import type { IEventBus } from '../../application/interfaces/IEventBus';
import { UserJoinedRoomEvent, UserLeftRoomEvent } from '../../domain/events/RoomEvents';
import { TYPES } from '../container/types';

/**
 * Room manager for WebSocket room operations
 */
@injectable()
export class RoomManager implements IRoomManager {
  private rooms: Map<string, RoomInfo> = new Map();
  private roomParticipants: Map<string, Map<string, RoomParticipant>> = new Map();
  private socketToIo: any; // Socket.IO server instance

  constructor(
    @inject(TYPES.EventBus) private readonly eventBus: IEventBus,
    @inject(TYPES.Logger) private readonly logger?: any
  ) {}

  /**
   * Set Socket.IO server instance
   */
  setSocketServer(io: any): void {
    this.socketToIo = io;
  }

  /**
   * Get room information
   */
  async getRoom(roomId: string): Promise<RoomInfo | undefined> {
    return this.rooms.get(roomId);
  }

  /**
   * Add user to room
   */
  async addUserToRoom(roomId: string, userId: string, socketId: string): Promise<void> {
    // Get or create room
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        name: `Room ${roomId}`,
        isActive: true,
        participantCount: 0,
        maxParticipants: 10
      };
      this.rooms.set(roomId, room);
      this.roomParticipants.set(roomId, new Map());
    }

    // Get or create participants map for room
    const participants = this.roomParticipants.get(roomId)!;
    
    // Check if user is already in room
    if (participants.has(userId)) {
      // Update socket ID for existing participant
      const participant = participants.get(userId)!;
      participant.socketId = socketId;
      participant.isActive = true;
    } else {
      // Add new participant
      const participant: RoomParticipant = {
        userId,
        username: `User${userId}`, // This should come from user service
        socketId,
        joinedAt: new Date(),
        role: participants.size === 0 ? 'owner' : 'participant',
        isActive: true
      };
      participants.set(userId, participant);
      room.participantCount++;
    }

    // Join socket to room
    if (this.socketToIo) {
      const socket = this.socketToIo.sockets.sockets.get(socketId);
      if (socket) {
        await socket.join(roomId);
      }
    }

    // Publish domain event
    const event = new UserJoinedRoomEvent({
      roomId,
      userId,
      username: participants.get(userId)!.username,
      participantCount: room.participantCount,
      joinedAt: new Date()
    });
    await this.eventBus.publish(event);

    this.logger?.info(`User ${userId} joined room ${roomId}`);
  }

  /**
   * Remove user from room
   */
  async removeUserFromRoom(roomId: string, userId: string, socketId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    const participants = this.roomParticipants.get(roomId);
    
    if (!room || !participants) {
      return;
    }

    const participant = participants.get(userId);
    if (participant) {
      participants.delete(userId);
      room.participantCount--;

      // Leave socket room
      if (this.socketToIo) {
        const socket = this.socketToIo.sockets.sockets.get(socketId);
        if (socket) {
          await socket.leave(roomId);
        }
      }

      // Publish domain event
      const event = new UserLeftRoomEvent({
        roomId,
        userId,
        username: participant.username,
        participantCount: room.participantCount,
        leftAt: new Date(),
        reason: 'voluntary'
      });
      await this.eventBus.publish(event);

      // Clean up empty rooms
      if (room.participantCount === 0) {
        this.rooms.delete(roomId);
        this.roomParticipants.delete(roomId);
      }

      this.logger?.info(`User ${userId} left room ${roomId}`);
    }
  }

  /**
   * Get room participants
   */
  async getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
    const participants = this.roomParticipants.get(roomId);
    return participants ? Array.from(participants.values()) : [];
  }

  /**
   * Broadcast message to all participants in a room
   */
  async broadcastToRoom(roomId: string, event: string, data: any, excludeSocketId?: string): Promise<void> {
    if (!this.socketToIo) {
      this.logger?.warn('Socket.IO server not set, cannot broadcast to room');
      return;
    }

    if (excludeSocketId) {
      this.socketToIo.to(roomId).except(excludeSocketId).emit(event, data);
    } else {
      this.socketToIo.to(roomId).emit(event, data);
    }

    this.logger?.debug(`Broadcasted ${event} to room ${roomId}`, data);
  }

  /**
   * Update room information
   */
  async updateRoom(roomId: string, updates: Partial<RoomInfo>): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      Object.assign(room, updates);
      
      // Broadcast room update to participants
      await this.broadcastToRoom(roomId, 'room_updated', { roomId, updates });
    }
  }

  /**
   * Set current track for room
   */
  async setRoomTrack(roomId: string, track: RoomInfo['currentTrack']): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      room.currentTrack = track;
      await this.broadcastToRoom(roomId, 'track_changed', { roomId, track });
    }
  }

  /**
   * Get all active rooms
   */
  getActiveRooms(): RoomInfo[] {
    return Array.from(this.rooms.values()).filter(room => room.isActive);
  }

  /**
   * Get room count
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Clean up inactive rooms
   */
  cleanupInactiveRooms(): void {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.participantCount === 0) {
        this.rooms.delete(roomId);
        this.roomParticipants.delete(roomId);
        this.logger?.info(`Cleaned up empty room: ${roomId}`);
      }
    }
  }
}
