import { Room } from '../entities/Room';

/**
 * Repository interface for Room aggregate
 */
export interface IRoomRepository {
  /**
   * Find room by unique identifier
   */
  findById(id: string): Promise<Room | null>;

  /**
   * Save room (create or update)
   */
  save(room: Room): Promise<void>;

  /**
   * Delete room by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Find rooms by creator
   */
  findByCreator(creatorId: string): Promise<Room[]>;

  /**
   * Find rooms where user is a participant
   */
  findByParticipant(userId: string): Promise<Room[]>;

  /**
   * Find public rooms with pagination
   */
  findPublicRooms(options: {
    page?: number;
    limit?: number;
    genre?: string;
    search?: string;
  }): Promise<{
    rooms: Room[];
    total: number;
    hasMore: boolean;
  }>;

  /**
   * Find active rooms (with recent activity)
   */
  findActiveRooms(options: {
    page?: number;
    limit?: number;
  }): Promise<Room[]>;

  /**
   * Count total rooms
   */
  count(): Promise<number>;

  /**
   * Count rooms by creator
   */
  countByCreator(creatorId: string): Promise<number>;
}
