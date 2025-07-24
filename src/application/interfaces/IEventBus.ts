import { DomainEvent } from '../../domain/events/DomainEvent';

/**
 * Event handler interface
 */
export interface EventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
}

/**
 * Event bus interface for publishing and subscribing to domain events
 */
export interface IEventBus {
  /**
   * Subscribe to a specific event type
   */
  subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void;

  /**
   * Unsubscribe from a specific event type
   */
  unsubscribe(eventName: string, handler: EventHandler): void;

  /**
   * Publish an event to all subscribers
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publish multiple events in sequence
   */
  publishAll(events: DomainEvent[]): Promise<void>;

  /**
   * Clear all event handlers
   */
  clear(): void;

  /**
   * Get all registered event types
   */
  getRegisteredEvents(): string[];
}

/**
 * Event store interface for persisting events
 */
export interface IEventStore {
  /**
   * Save an event to the store
   */
  saveEvent(event: DomainEvent): Promise<void>;

  /**
   * Get events for a specific aggregate
   */
  getEventsForAggregate(aggregateId: string): Promise<DomainEvent[]>;

  /**
   * Get events by type
   */
  getEventsByType(eventType: string): Promise<DomainEvent[]>;

  /**
   * Get all events after a specific timestamp
   */
  getEventsAfter(timestamp: Date): Promise<DomainEvent[]>;
}
