import { Room } from '../entities/Room';
import { User } from '../entities/User';
import { BusinessRuleViolationError } from '../../shared/errors/DomainError';
import { AppError } from '../../shared/errors/AppError';
import { IRoomRepository } from '../repositories/IRoomRepository';
import { IUserRepository } from '../repositories/IUserRepository';

/**
 * Domain service for room-related business logic
 */
export class RoomDomainService {
  constructor(
    private readonly roomRepository: IRoomRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Validate room creation limits for user
   */
  async validateRoomCreationLimits(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BusinessRuleViolationError('User not found');
    }

    const userRooms = await this.roomRepository.findByCreator(userId);
    const activeRooms = userRooms.filter(room => room.getIsActive());

    // Regular users can have max 5 active rooms, admins unlimited
    const maxRooms = user.canAdministrate() ? Infinity : 5;
    
    if (activeRooms.length >= maxRooms) {
      throw new BusinessRuleViolationError(
        `Maximum active rooms limit reached (${maxRooms})`
      );
    }
  }

  /**
   * Validate if user can join a room
   */
  async validateUserCanJoinRoom(room: Room, userId: string): Promise<void> {
    if (!room.getIsActive()) {
      throw new BusinessRuleViolationError('Room is not active');
    }

    if (room.getParticipant(userId)) {
      throw new BusinessRuleViolationError('User is already a participant in this room');
    }

    const settings = room.getSettings();
    
    if (room.getParticipantCount() >= settings.maxParticipants) {
      throw new BusinessRuleViolationError('Room has reached maximum participant capacity');
    }

    // Check if user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BusinessRuleViolationError('User not found');
    }
  }

  /**
   * Find recommended rooms for a user based on their musical preferences
   */
  async findRecommendedRooms(
    userId: string,
    options: { limit?: number } = {}
  ): Promise<Room[]> {
    const { limit = 10 } = options;
    
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return [];
    }

    const preferences = user.getProfile().getMusicalPreferences();
    const userGenres = preferences.getGenres();
    
    // Find public rooms with matching genres
    const publicRooms = await this.roomRepository.findPublicRooms({
      limit: limit * 2, // Get more to filter and rank
    });

    // Score rooms based on compatibility
    const scoredRooms = publicRooms.rooms
      .filter(room => room.getIsActive())
      .filter(room => !room.getParticipant(userId)) // Exclude rooms user is already in
      .map(room => ({
        room,
        score: this.calculateRoomCompatibilityScore(room, userGenres),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.room);

    return scoredRooms;
  }

  /**
   * Get room statistics
   */
  async getRoomStatistics(): Promise<{
    totalRooms: number;
    activeRooms: number;
    averageParticipants: number;
    popularGenres: Array<{ genre: string; count: number }>;
  }> {
    // This would require more sophisticated queries in a real implementation
    const totalRooms = await this.roomRepository.count();
    
    // Placeholder implementation
    return {
      totalRooms,
      activeRooms: 0, // Would need active room count query
      averageParticipants: 0, // Would need participant statistics
      popularGenres: [], // Would need genre aggregation
    };
  }

  /**
   * Clean up inactive rooms (business rule: rooms with no activity for 30 days)
   */
  async cleanupInactiveRooms(): Promise<number> {
    // This would be called by a scheduled job
    // Implementation would find rooms with no activity for 30+ days and deactivate them
    
    // Placeholder implementation
    return 0;
  }

  /**
   * Validate room settings and constraints
   */
  async validateRoomConstraints(
    settings: {
      maxParticipants: number;
      genre: string;
      isPrivate: boolean;
      maxFileSize: number;
      allowedFormats: string[];
    },
    roomRepository: IRoomRepository
  ): Promise<void> {
    if (settings.maxParticipants < 1 || settings.maxParticipants > 50) {
      throw new BusinessRuleViolationError('Max participants must be between 1 and 50');
    }

    if (settings.maxFileSize < 1024 || settings.maxFileSize > 100 * 1024 * 1024) {
      throw new BusinessRuleViolationError('File size must be between 1KB and 100MB');
    }

    if (settings.allowedFormats.length === 0) {
      throw new BusinessRuleViolationError('At least one file format must be allowed');
    }
  }

  /**
   * Check if user can join room
   */
  async canUserJoinRoom(roomId: string, userId: string, roomRepository: IRoomRepository): Promise<boolean> {
    const room = await roomRepository.findById(roomId);
    if (!room) {
      return false;
    }

    // Check if room is full
    const participants = room.getParticipants();
    if (participants.length >= 50) { // Default max participants
      return false;
    }

    // Check if user is already in room
    if (participants.some(p => p.userId === userId)) {
      return true; // Already in room
    }

    // For now, allow joining any public room
    return true;
  }  private calculateRoomCompatibilityScore(room: Room, userGenres: readonly string[]): number {
    let score = 0;
    
    // Base score for active rooms
    if (room.getIsActive()) {
      score += 0.3;
    }

    // Score based on genre match
    const roomGenre = room.getGenre();
    if (roomGenre && userGenres.includes(roomGenre.toLowerCase())) {
      score += 0.5;
    }

    // Score based on participant count (more participants = more attractive, but not overcrowded)
    const participantRatio = room.getParticipantCount() / room.getSettings().maxParticipants;
    if (participantRatio > 0.2 && participantRatio < 0.8) {
      score += 0.2;
    }

    return score;
  }
}
