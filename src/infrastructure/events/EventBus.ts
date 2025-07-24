import { injectable, inject } from 'inversify';
import { DomainEvent } from '../../domain/events/DomainEvent';
import type { IEventBus, EventHandler, IEventStore } from '../../application/interfaces/IEventBus';
import { TYPES } from '../container/types';

/**
 * In-memory event bus implementation with optional event store persistence
 */
@injectable()
export class EventBus implements IEventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private isProcessing: boolean = false;

  constructor(
    @inject(TYPES.EventStore) private readonly eventStore?: IEventStore,
    @inject(TYPES.Logger) private readonly logger?: any
  ) {}

  /**
   * Subscribe to a specific event type
   */
  subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventName) || [];
    handlers.push(handler as EventHandler);
    this.handlers.set(eventName, handlers);

    this.logger?.info(`Event handler subscribed to: ${eventName}`);
  }

  /**
   * Unsubscribe from a specific event type
   */
  unsubscribe(eventName: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventName) || [];
    const index = handlers.indexOf(handler);
    
    if (index > -1) {
      handlers.splice(index, 1);
      this.handlers.set(eventName, handlers);
      this.logger?.info(`Event handler unsubscribed from: ${eventName}`);
    }
  }

  /**
   * Publish an event to all subscribers
   */
  async publish(event: DomainEvent): Promise<void> {
    const eventName = event.getEventName();
    const handlers = this.handlers.get(eventName) || [];

    this.logger?.info(`Publishing event: ${eventName} for aggregate: ${event.aggregateId}`);

    try {
      // Save to event store if available
      if (this.eventStore) {
        await this.eventStore.saveEvent(event);
      }

      // Process handlers in parallel
      const promises = handlers.map(handler => this.executeHandler(handler, event));
      await Promise.all(promises);

      this.logger?.info(`Event processed successfully: ${eventName}`);
    } catch (error) {
      this.logger?.error(`Error processing event ${eventName}:`, error);
      throw error;
    }
  }

  /**
   * Publish multiple events in sequence
   */
  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Execute a single event handler with error handling
   */
  private async executeHandler(handler: EventHandler, event: DomainEvent): Promise<void> {
    try {
      await handler.handle(event);
    } catch (error) {
      this.logger?.error(`Event handler failed for ${event.getEventName()}:`, error);
      // Don't rethrow - we want other handlers to continue
    }
  }

  /**
   * Clear all event handlers
   */
  clear(): void {
    this.handlers.clear();
    this.logger?.info('All event handlers cleared');
  }

  /**
   * Get all registered event types
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get handler count for debugging
   */
  getHandlerCount(eventName?: string): number {
    if (eventName) {
      return this.handlers.get(eventName)?.length || 0;
    }
    return Array.from(this.handlers.values()).reduce((sum, handlers) => sum + handlers.length, 0);
  }
}

/**
 * Event store implementation using Prisma for persistence
 */
@injectable()
export class PrismaEventStore implements IEventStore {
  constructor(
    @inject(TYPES.PrismaClient) private readonly prisma: any,
    @inject(TYPES.Logger) private readonly logger?: any
  ) {}

  /**
   * Save an event to the store
   */
  async saveEvent(event: DomainEvent): Promise<void> {
    try {
      await this.prisma.domainEvent.create({
        data: {
          eventId: event.eventId,
          eventName: event.getEventName(),
          aggregateId: event.aggregateId,
          eventVersion: event.eventVersion,
          eventData: JSON.stringify(event.getEventData()),
          occurredAt: event.occurredAt
        }
      });

      this.logger?.debug(`Event stored: ${event.getEventName()}`);
    } catch (error) {
      this.logger?.error(`Failed to store event ${event.getEventName()}:`, error);
      throw error;
    }
  }

  /**
   * Get events for a specific aggregate
   */
  async getEventsForAggregate(aggregateId: string): Promise<DomainEvent[]> {
    try {
      const events = await this.prisma.domainEvent.findMany({
        where: { aggregateId },
        orderBy: { occurredAt: 'asc' }
      });

      return events.map((event: any) => this.deserializeEvent(event));
    } catch (error) {
      this.logger?.error(`Failed to get events for aggregate ${aggregateId}:`, error);
      throw error;
    }
  }

  /**
   * Get events by type
   */
  async getEventsByType(eventType: string): Promise<DomainEvent[]> {
    try {
      const events = await this.prisma.domainEvent.findMany({
        where: { eventName: eventType },
        orderBy: { occurredAt: 'asc' }
      });

      return events.map((event: any) => this.deserializeEvent(event));
    } catch (error) {
      this.logger?.error(`Failed to get events by type ${eventType}:`, error);
      throw error;
    }
  }

  /**
   * Get all events after a specific timestamp
   */
  async getEventsAfter(timestamp: Date): Promise<DomainEvent[]> {
    try {
      const events = await this.prisma.domainEvent.findMany({
        where: { 
          occurredAt: { 
            gt: timestamp 
          } 
        },
        orderBy: { occurredAt: 'asc' }
      });

      return events.map((event: any) => this.deserializeEvent(event));
    } catch (error) {
      this.logger?.error(`Failed to get events after ${timestamp}:`, error);
      throw error;
    }
  }

  /**
   * Deserialize stored event back to domain event
   */
  private deserializeEvent(storedEvent: any): DomainEvent {
    // This is a simplified implementation
    // In a real system, you'd have a registry of event types
    return {
      eventId: storedEvent.eventId,
      aggregateId: storedEvent.aggregateId,
      eventVersion: storedEvent.eventVersion,
      occurredAt: storedEvent.occurredAt,
      getEventName: () => storedEvent.eventName,
      getEventData: () => JSON.parse(storedEvent.eventData),
      toPlainObject: function() {
        return {
          eventId: this.eventId,
          eventName: this.getEventName(),
          aggregateId: this.aggregateId,
          eventVersion: this.eventVersion,
          occurredAt: this.occurredAt,
          data: this.getEventData()
        };
      }
    } as DomainEvent;
  }
}
