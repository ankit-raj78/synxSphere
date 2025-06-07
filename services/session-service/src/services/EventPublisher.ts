import kafkaService from './KafkaService';
import { createLogger } from '../utils/logger';

const logger = createLogger('EventPublisher');

export interface KafkaEvent {
  type: string;
  payload: any;
  timestamp: Date;
  userId?: string;
  roomId?: string;
  sessionId?: string;
}

export class EventPublisher {
  private kafka = kafkaService;

  async initialize(): Promise<void> {
    await this.kafka.initialize();
  }

  async publishRoomEvent(
    roomId: string,
    eventType: string,
    payload: any,
    userId?: string
  ): Promise<void> {
    const event: KafkaEvent = {
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

    await this.kafka.publishEvent('room-events', event);
    logger.info('Room event published', { roomId, eventType, userId });
  }

  async publishUserEvent(
    userId: string,
    eventType: string,
    payload: any
  ): Promise<void> {
    const event: KafkaEvent = {
      type: `user.${eventType}`,
      payload: {
        userId,
        ...payload
      },
      timestamp: new Date(),
      userId
    };

    await this.kafka.publishEvent('user-events', event);
    logger.info('User event published', { userId, eventType });
  }

  async publishSessionEvent(
    sessionId: string,
    eventType: string,
    payload: any,
    userId?: string,
    roomId?: string
  ): Promise<void> {
    const event: KafkaEvent = {
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

    await this.kafka.publishEvent('session-events', event);
    logger.info('Session event published', { sessionId, eventType, userId, roomId });
  }

  async publishAudioEvent(
    eventType: string,
    payload: any,
    userId?: string,
    roomId?: string
  ): Promise<void> {
    const event: KafkaEvent = {
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

    await this.kafka.publishEvent('audio-events', event);
    logger.info('Audio event published', { eventType, userId, roomId });
  }

  async close(): Promise<void> {
    await this.kafka.close();
  }
}

export default new EventPublisher();
