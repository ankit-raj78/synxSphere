import { generateId } from '../../shared/utils';
import { InvalidDataError, BusinessRuleViolationError } from '../../shared/errors/DomainError';

export interface RoomSettings {
  maxParticipants: number;
  isPublic: boolean;
  requiresApproval: boolean;
  allowFileUpload: boolean;
  allowRecording: boolean;
  genre?: string;
  targetTempo?: number;
  targetKey?: string;
}

export type ParticipantRole = 'creator' | 'moderator' | 'participant';

export interface RoomParticipant {
  userId: string;
  username: string;
  role: ParticipantRole;
  joinedAt: Date;
  lastActive: Date;
}

/**
 * Room domain entity representing a collaboration room
 */
export class Room {
  private constructor(
    private readonly id: string,
    private name: string,
    private description: string | null,
    private readonly creatorId: string,
    private genre: string | null,
    private settings: RoomSettings,
    private isActive: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private participants: Map<string, RoomParticipant> = new Map()
  ) {}

  /**
   * Factory method to create a new room
   */
  public static create(params: {
    name: string;
    description?: string;
    creatorId: string;
    genre?: string;
    settings?: Partial<RoomSettings>;
  }): Room {
    if (!params.name?.trim()) {
      throw new InvalidDataError('Room name is required', 'name');
    }

    if (params.name.trim().length > 100) {
      throw new InvalidDataError('Room name cannot exceed 100 characters', 'name');
    }

    if (params.description && params.description.length > 500) {
      throw new InvalidDataError('Room description cannot exceed 500 characters', 'description');
    }

    if (!params.creatorId?.trim()) {
      throw new InvalidDataError('Creator ID is required', 'creatorId');
    }

    const defaultSettings: RoomSettings = {
      maxParticipants: 10,
      isPublic: true,
      requiresApproval: false,
      allowFileUpload: true,
      allowRecording: true,
    };

    const settings = { ...defaultSettings, ...params.settings };

    // Validate settings
    if (settings.maxParticipants < 2 || settings.maxParticipants > 50) {
      throw new InvalidDataError('Max participants must be between 2 and 50', 'maxParticipants');
    }

    if (settings.targetTempo && (settings.targetTempo < 30 || settings.targetTempo > 250)) {
      throw new InvalidDataError('Target tempo must be between 30 and 250 BPM', 'targetTempo');
    }

    const room = new Room(
      generateId(),
      params.name.trim(),
      params.description?.trim() || null,
      params.creatorId,
      params.genre?.trim() || null,
      settings,
      true,
      new Date(),
      new Date()
    );

    // Add creator as first participant
    room.addCreatorAsParticipant(params.creatorId, 'creator'); // We'll need username from somewhere

    return room;
  }

  /**
   * Factory method to reconstruct room from persistence
   */
  public static fromPersistence(data: {
    id: string;
    name: string;
    description: string | null;
    creatorId: string;
    genre: string | null;
    settings: any;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    participants?: any[];
  }): Room {
    const settings = typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings;
    
    const room = new Room(
      data.id,
      data.name,
      data.description,
      data.creatorId,
      data.genre,
      settings,
      data.isActive,
      data.createdAt,
      data.updatedAt
    );

    // Reconstruct participants if provided
    if (data.participants) {
      data.participants.forEach(p => {
        room.participants.set(p.userId, {
          userId: p.userId,
          username: p.username || 'Unknown',
          role: p.role,
          joinedAt: new Date(p.joinedAt),
          lastActive: new Date(p.lastActive),
        });
      });
    }

    return room;
  }

  /**
   * Add a participant to the room
   */
  public addParticipant(userId: string, username: string, requestingUserId?: string): void {
    if (!this.isActive) {
      throw new BusinessRuleViolationError('Cannot join inactive room');
    }

    if (this.participants.has(userId)) {
      throw new BusinessRuleViolationError('User is already a participant in this room');
    }

    if (this.participants.size >= this.settings.maxParticipants) {
      throw new BusinessRuleViolationError('Room has reached maximum participant limit');
    }

    // Check if approval is required
    if (this.settings.requiresApproval && requestingUserId !== this.creatorId) {
      // In a real implementation, this would create a join request
      throw new BusinessRuleViolationError('This room requires approval to join');
    }

    const participant: RoomParticipant = {
      userId,
      username,
      role: 'participant',
      joinedAt: new Date(),
      lastActive: new Date(),
    };

    this.participants.set(userId, participant);
    this.updatedAt = new Date();
  }

  /**
   * Remove a participant from the room
   */
  public removeParticipant(userId: string, requestingUserId: string): void {
    if (!this.participants.has(userId)) {
      throw new BusinessRuleViolationError('User is not a participant in this room');
    }

    const participant = this.participants.get(userId)!;
    const requestingParticipant = this.participants.get(requestingUserId);

    // Check permissions
    if (userId !== requestingUserId) { // Not removing self
      if (requestingUserId !== this.creatorId && 
          (!requestingParticipant || requestingParticipant.role !== 'moderator')) {
        throw new BusinessRuleViolationError('Insufficient permissions to remove participant');
      }
    }

    // Cannot remove the creator
    if (participant.role === 'creator') {
      throw new BusinessRuleViolationError('Cannot remove room creator');
    }

    this.participants.delete(userId);
    this.updatedAt = new Date();
  }

  /**
   * Update participant's last active time
   */
  public updateParticipantActivity(userId: string): void {
    const participant = this.participants.get(userId);
    if (participant) {
      participant.lastActive = new Date();
      this.updatedAt = new Date();
    }
  }

  /**
   * Promote a participant to moderator
   */
  public promoteToModerator(userId: string, requestingUserId: string): void {
    if (requestingUserId !== this.creatorId) {
      throw new BusinessRuleViolationError('Only room creator can promote participants');
    }

    const participant = this.participants.get(userId);
    if (!participant) {
      throw new BusinessRuleViolationError('User is not a participant in this room');
    }

    if (participant.role === 'creator') {
      throw new BusinessRuleViolationError('Cannot change creator role');
    }

    participant.role = 'moderator';
    this.updatedAt = new Date();
  }

  /**
   * Update room settings
   */
  public updateSettings(newSettings: Partial<RoomSettings>, requestingUserId: string): void {
    const requestingParticipant = this.participants.get(requestingUserId);
    
    if (requestingUserId !== this.creatorId && 
        (!requestingParticipant || requestingParticipant.role !== 'moderator')) {
      throw new BusinessRuleViolationError('Insufficient permissions to update room settings');
    }

    // Validate new settings
    if (newSettings.maxParticipants !== undefined) {
      if (newSettings.maxParticipants < 2 || newSettings.maxParticipants > 50) {
        throw new InvalidDataError('Max participants must be between 2 and 50', 'maxParticipants');
      }
      
      // Cannot reduce below current participant count
      if (newSettings.maxParticipants < this.participants.size) {
        throw new BusinessRuleViolationError(
          'Cannot set max participants below current participant count'
        );
      }
    }

    if (newSettings.targetTempo !== undefined && 
        (newSettings.targetTempo < 30 || newSettings.targetTempo > 250)) {
      throw new InvalidDataError('Target tempo must be between 30 and 250 BPM', 'targetTempo');
    }

    this.settings = { ...this.settings, ...newSettings };
    this.updatedAt = new Date();
  }

  /**
   * Update room basic information
   */
  public updateInfo(updates: {
    name?: string;
    description?: string;
    genre?: string;
  }, requestingUserId: string): void {
    const requestingParticipant = this.participants.get(requestingUserId);
    
    if (requestingUserId !== this.creatorId && 
        (!requestingParticipant || requestingParticipant.role !== 'moderator')) {
      throw new BusinessRuleViolationError('Insufficient permissions to update room information');
    }

    if (updates.name !== undefined) {
      if (!updates.name.trim()) {
        throw new InvalidDataError('Room name cannot be empty', 'name');
      }
      if (updates.name.trim().length > 100) {
        throw new InvalidDataError('Room name cannot exceed 100 characters', 'name');
      }
      this.name = updates.name.trim();
    }

    if (updates.description !== undefined) {
      if (updates.description && updates.description.length > 500) {
        throw new InvalidDataError('Room description cannot exceed 500 characters', 'description');
      }
      this.description = updates.description?.trim() || null;
    }

    if (updates.genre !== undefined) {
      this.genre = updates.genre?.trim() || null;
    }

    this.updatedAt = new Date();
  }

  /**
   * Deactivate the room
   */
  public deactivate(requestingUserId: string): void {
    if (requestingUserId !== this.creatorId) {
      throw new BusinessRuleViolationError('Only room creator can deactivate the room');
    }

    this.isActive = false;
    this.updatedAt = new Date();
  }

  /**
   * Check if user can perform actions in this room
   */
  public canUserModerate(userId: string): boolean {
    if (userId === this.creatorId) return true;
    
    const participant = this.participants.get(userId);
    return participant?.role === 'moderator';
  }

  /**
   * Get participant information
   */
  public getParticipant(userId: string): RoomParticipant | null {
    return this.participants.get(userId) || null;
  }

  /**
   * Get all participants
   */
  public getParticipants(): RoomParticipant[] {
    return Array.from(this.participants.values());
  }

  /**
   * Get active participants (active in last 5 minutes)
   */
  public getActiveParticipants(): RoomParticipant[] {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.getParticipants().filter(p => p.lastActive > fiveMinutesAgo);
  }

  private addCreatorAsParticipant(creatorId: string, username: string): void {
    const creator: RoomParticipant = {
      userId: creatorId,
      username,
      role: 'creator',
      joinedAt: new Date(),
      lastActive: new Date(),
    };
    this.participants.set(creatorId, creator);
  }

  // Getters
  public getId(): string { return this.id; }
  public getName(): string { return this.name; }
  public getDescription(): string | null { return this.description; }
  public getCreatorId(): string { return this.creatorId; }
  public getGenre(): string | null { return this.genre; }
  public getSettings(): Readonly<RoomSettings> { return { ...this.settings }; }
  public getIsActive(): boolean { return this.isActive; }
  public getCreatedAt(): Date { return this.createdAt; }
  public getUpdatedAt(): Date { return this.updatedAt; }
  public getParticipantCount(): number { return this.participants.size; }

  /**
   * Convert to persistence format
   */
  public toPersistence(): {
    id: string;
    name: string;
    description: string | null;
    creatorId: string;
    genre: string | null;
    settings: RoomSettings;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      creatorId: this.creatorId,
      genre: this.genre,
      settings: this.settings,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
