import { DomainEvent } from './DomainEvent';

/**
 * Event fired when a new room is created
 */
export class RoomCreatedEvent extends DomainEvent {
  constructor(
    public readonly data: {
      roomId: string;
      name: string;
      creatorId: string;
      isPublic: boolean;
      maxParticipants: number;
      genres: string[];
    }
  ) {
    super(data.roomId);
  }

  getEventName(): string {
    return 'room.created';
  }

  getEventData(): any {
    return this.data;
  }

  static fromPlainObject(obj: any): RoomCreatedEvent {
    return new RoomCreatedEvent(obj.data);
  }

  // Legacy compatibility
  get roomId(): string { return this.data.roomId; }
  get name(): string { return this.data.name; }
  get creatorId(): string { return this.data.creatorId; }
  get isPublic(): boolean { return this.data.isPublic; }
}

/**
 * Event fired when a user joins a room
 */
export class UserJoinedRoomEvent extends DomainEvent {
  constructor(
    public readonly data: {
      roomId: string;
      userId: string;
      username: string;
      participantCount: number;
      joinedAt: Date;
    }
  ) {
    super(data.roomId);
  }

  getEventName(): string {
    return 'room.user_joined';
  }

  getEventData(): any {
    return this.data;
  }

  static fromPlainObject(obj: any): UserJoinedRoomEvent {
    return new UserJoinedRoomEvent({
      ...obj.data,
      joinedAt: new Date(obj.data.joinedAt)
    });
  }

  // Legacy compatibility
  get roomId(): string { return this.data.roomId; }
  get userId(): string { return this.data.userId; }
  get username(): string { return this.data.username; }
  get participantCount(): number { return this.data.participantCount; }
}

/**
 * Event fired when a user leaves a room
 */
export class UserLeftRoomEvent extends DomainEvent {
  constructor(
    public readonly data: {
      roomId: string;
      userId: string;
      username: string;
      participantCount: number;
      leftAt: Date;
      reason?: 'voluntary' | 'kicked' | 'disconnected';
    }
  ) {
    super(data.roomId);
  }

  getEventName(): string {
    return 'room.user_left';
  }

  getEventData(): any {
    return this.data;
  }

  static fromPlainObject(obj: any): UserLeftRoomEvent {
    return new UserLeftRoomEvent({
      ...obj.data,
      leftAt: new Date(obj.data.leftAt)
    });
  }

  // Legacy compatibility
  get roomId(): string { return this.data.roomId; }
  get userId(): string { return this.data.userId; }
  get username(): string { return this.data.username; }
  get participantCount(): number { return this.data.participantCount; }
}

/**
 * Event fired when room settings are updated
 */
export class RoomSettingsUpdatedEvent extends DomainEvent {
  constructor(
    public readonly data: {
      roomId: string;
      updatedBy: string;
      changes: Record<string, any>;
      previousSettings: Record<string, any>;
    }
  ) {
    super(data.roomId);
  }

  getEventName(): string {
    return 'room.settings_updated';
  }

  getEventData(): any {
    return this.data;
  }

  static fromPlainObject(obj: any): RoomSettingsUpdatedEvent {
    return new RoomSettingsUpdatedEvent(obj.data);
  }

  // Legacy compatibility
  get roomId(): string { return this.data.roomId; }
  get updatedBy(): string { return this.data.updatedBy; }
  get changes(): any { return this.data.changes; }
}

/**
 * Event fired when audio playback is synced in a room
 */
export class AudioPlaybackSyncedEvent extends DomainEvent {
  constructor(
    public readonly data: {
      roomId: string;
      fileId: string;
      userId: string;
      position: number;
      isPlaying: boolean;
      timestamp: Date;
    }
  ) {
    super(data.roomId);
  }

  getEventName(): string {
    return 'audio.playback_synced';
  }

  getEventData(): any {
    return this.data;
  }

  static fromPlainObject(obj: any): AudioPlaybackSyncedEvent {
    return new AudioPlaybackSyncedEvent({
      ...obj.data,
      timestamp: new Date(obj.data.timestamp)
    });
  }
}
