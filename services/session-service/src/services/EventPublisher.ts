import { createLogger } from '../utils/logger';
import { EventEmitter } from 'events';

const logger = createLogger('EventPublisher');

export interface SessionEvent {
  type: string;
  payload: any;
  timestamp: Date;
  userId?: string;
  roomId?: string;
  sessionId?: string;
}

export class EventPublisher {
  private eventEmitter = new EventEmitter();

  async initialize(): Promise<void> {
    logger.info('Event publisher initialized (in-memory mode)');
  }

  async publishRoomEvent(
    roomId: string,
    eventType: string,
    payload: any,
    userId?: string
  ): Promise<void> {
    const event: SessionEvent = {
      type: `room.${eventType}`,
      payload: {
        roomId,
        userId,
        ...payload
      },
      timestamp: new Date(),
      roomId,
      userId
    };

    this.eventEmitter.emit('room-events', event);
    logger.info('Room event published', { roomId, eventType, userId });
  }

  async publishUserEvent(
    userId: string,
    eventType: string,
    payload: any
  ): Promise<void> {
    const event: SessionEvent = {
      type: `user.${eventType}`,
      payload: {
        userId,
        ...payload
      },
      timestamp: new Date(),
      userId
    };

    this.eventEmitter.emit('user-events', event);
    logger.info('User event published', { userId, eventType });
  }

  async publishSessionEvent(
    sessionId: string,
    eventType: string,
    payload: any,
    userId?: string,
    roomId?: string
  ): Promise<void> {
    const event: SessionEvent = {
      type: `session.${eventType}`,
      payload: {
        sessionId,
        userId,
        roomId,
        ...payload
      },
      timestamp: new Date(),
      sessionId,
      userId,
      roomId
    };

    this.eventEmitter.emit('session-events', event);
    logger.info('Session event published', { sessionId, eventType, userId, roomId });
  }

  async publishAudioEvent(
    eventType: string,
    payload: any,
    userId?: string,
    roomId?: string
  ): Promise<void> {
    const event: SessionEvent = {
      type: `audio.${eventType}`,
      payload: {
        userId,
        roomId,
        ...payload
      },
      timestamp: new Date(),
      userId,
      roomId
    };

    this.eventEmitter.emit('audio-events', event);
    logger.info('Audio event published', { eventType, userId, roomId });
  }

  // Subscribe to events
  on(eventType: string, listener: (event: SessionEvent) => void): void {
    this.eventEmitter.on(eventType, listener);
  }

  // Remove event listeners
  off(eventType: string, listener: (event: SessionEvent) => void): void {
    this.eventEmitter.off(eventType, listener);
  }

  async close(): Promise<void> {
    this.eventEmitter.removeAllListeners();
    logger.info('Event publisher closed');
  }
}

export default new EventPublisher();
