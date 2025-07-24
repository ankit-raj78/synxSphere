import { DomainEvent } from './DomainEvent';

/**
 * Event fired when a new user is created
 */
export class UserCreatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly username: string,
    public readonly profile: any
  ) {
    super(userId, 1);
  }

  getEventName(): string {
    return 'user.created';
  }

  getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      email: this.email,
      username: this.username,
      profile: this.profile
    };
  }

  getAggregateId(): string {
    return this.userId;
  }
}

/**
 * Event fired when user profile is updated
 */
export class UserProfileUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly changes: {
      email?: { old: string; new: string };
      username?: { old: string; new: string };
      profile?: { old: any; new: any };
    }
  ) {
    super(userId, 1);
  }

  getEventName(): string {
    return 'user.profile.updated';
  }

  getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      changes: this.changes
    };
  }

  getAggregateId(): string {
    return this.userId;
  }
}

/**
 * Event fired when user's musical preferences are updated
 */
/**
 * Event fired when user's musical preferences are updated
 */
export class MusicalPreferencesUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly oldPreferences: any,
    public readonly newPreferences: any
  ) {
    super(userId, 1);
  }

  getEventName(): string {
    return 'user.musical-preferences.updated';
  }

  getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      oldPreferences: this.oldPreferences,
      newPreferences: this.newPreferences
    };
  }

  getAggregateId(): string {
    return this.userId;
  }
}
