import { User } from '../entities/User';

/**
 * Repository interface for User aggregate
 * Defines the contract for user persistence operations
 */
export interface IUserRepository {
  /**
   * Find user by unique identifier
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by email address
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find user by username
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Check if email already exists
   */
  emailExists(email: string): Promise<boolean>;

  /**
   * Check if username already exists
   */
  usernameExists(username: string): Promise<boolean>;

  /**
   * Save user (create or update)
   */
  save(user: User): Promise<void>;

  /**
   * Delete user by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Find users with pagination and filtering
   */
  findMany(options: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }): Promise<{
    users: User[];
    total: number;
    hasMore: boolean;
  }>;

  /**
   * Find users by musical preferences similarity
   */
  findByMusicalPreferences(preferences: {
    genres?: string[];
    instruments?: string[];
    experience?: string;
    collaborationStyle?: string;
  }): Promise<User[]>;

  /**
   * Count total users
   */
  count(): Promise<number>;
}
