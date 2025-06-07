import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { logger } from '../utils/logger';

export class KafkaService {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private connected: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'session-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      connectionTimeout: 3000,
      authenticationTimeout: 1000,
      reauthenticationThreshold: 10000,
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'session-service-group' });
  }

  async initialize(): Promise<void> {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      this.connected = true;
      logger.info('Kafka service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Kafka service:', error);
      throw error;
    }
  }

  async publishEvent(topic: string, event: any): Promise<void> {
    if (!this.connected) {
      logger.warn('Kafka not connected, skipping event publish');
      return;
    }

    try {
      await this.producer.send({
        topic,
        messages: [{
          key: event.userId || event.roomId || 'system',
          value: JSON.stringify(event),
          timestamp: Date.now().toString()
        }]
      });

      logger.debug('Event published to Kafka', { topic, eventType: event.type });
    } catch (error) {
      logger.error('Failed to publish event to Kafka:', error);
      // Don't throw - we don't want to break the main flow for event publishing issues
    }
  }

  async subscribeToTopic(
    topic: string,
    handler: (payload: EachMessagePayload) => Promise<void>
  ): Promise<void> {
    if (!this.connected) {
      throw new Error('Kafka not connected');
    }

    try {
      await this.consumer.subscribe({ topic, fromBeginning: false });
      
      await this.consumer.run({
        eachMessage: async (payload) => {
          try {
            await handler(payload);
          } catch (error) {
            logger.error('Error processing Kafka message:', {
              error,
              topic: payload.topic,
              partition: payload.partition,
              offset: payload.message.offset
            });
          }
        }
      });

      logger.info('Subscribed to Kafka topic', { topic });
    } catch (error) {
      logger.error('Failed to subscribe to Kafka topic:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      this.connected = false;
      logger.info('Kafka service closed');
    } catch (error) {
      logger.error('Error closing Kafka service:', error);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export default new KafkaService();
