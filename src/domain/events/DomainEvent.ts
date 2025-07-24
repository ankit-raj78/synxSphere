/**
 * Base class for all domain events
 * Provides common properties and structure for event-driven architecture
 */
export abstract class DomainEvent {
  public readonly occurredAt: Date;
  public readonly aggregateId: string;
  public readonly eventId: string;
  public readonly eventVersion: number;

  constructor(aggregateId: string, eventVersion: number = 1) {
    this.aggregateId = aggregateId;
    this.eventVersion = eventVersion;
    this.occurredAt = new Date();
    this.eventId = this.generateEventId();
  }

  /**
   * Get the name of the event
   */
  abstract getEventName(): string;

  /**
   * Get event payload for serialization
   */
  abstract getEventData(): any;

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `${this.getEventName()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert event to plain object for storage/transmission
   */
  toPlainObject(): any {
    return {
      eventId: this.eventId,
      eventName: this.getEventName(),
      aggregateId: this.aggregateId,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      data: this.getEventData()
    };
  }

  /**
   * Create event from plain object (for deserialization)
   */
  static fromPlainObject(obj: any): DomainEvent {
    // This would be implemented by concrete event classes
    throw new Error('fromPlainObject must be implemented by concrete event classes');
  }

  // Legacy compatibility methods
  get occurredOn(): Date {
    return this.occurredAt;
  }

  getAggregateId(): string {
    return this.aggregateId;
  }
}
