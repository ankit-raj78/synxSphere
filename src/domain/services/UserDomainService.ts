import { injectable } from 'inversify';
import { User } from '../entities/User';
import { BusinessRuleViolationError } from '../../shared/errors/DomainError';
import { IUserRepository } from '../repositories/IUserRepository';

/**
 * Domain service for user-related business logic that spans multiple entities
 * or requires repository access for business rules
 */
@injectable()
export class UserDomainService {
  constructor() {}

  /**
   * Validate that email is unique in the system
   */
  async validateUniqueEmail(email: string, userRepository: IUserRepository): Promise<void> {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new BusinessRuleViolationError('Email address is already registered');
    }
  }

  /**
   * Validate that username is unique in the system
   */
  async validateUniqueUsername(username: string, userRepository: IUserRepository): Promise<void> {
    const existingUser = await userRepository.findByUsername(username);
    if (existingUser) {
      throw new BusinessRuleViolationError('Username is already taken');
    }
  }

  /**
   * Find compatible users based on musical preferences
   */
  async findCompatibleUsers(
    targetUser: User,
    userRepository: IUserRepository,
    options: {
      minCompatibilityScore?: number;
      limit?: number;
    } = {}
  ): Promise<Array<{
    user: User;
    compatibilityScore: number;
  }>> {
    const { minCompatibilityScore = 0.3, limit = 10 } = options;
    
    // Find users with similar musical preferences
    const preferences = targetUser.getProfile().getMusicalPreferences();
    const potentialMatches = await userRepository.findByMusicalPreferences({
      genres: preferences.getGenres().length > 0 ? [...preferences.getGenres()] : undefined,
      instruments: preferences.getInstruments().length > 0 ? [...preferences.getInstruments()] : undefined,
      experience: preferences.getExperience(),
      collaborationStyle: preferences.getCollaborationStyle(),
    });

    // Calculate compatibility scores and filter
    const compatibleUsers = potentialMatches
      .filter((user: User) => user.getId() !== targetUser.getId()) // Exclude self
      .map((user: User) => ({
        user,
        compatibilityScore: targetUser.calculateCompatibilityWith(user).overallScore,
      }))
      .filter((match: any) => match.compatibilityScore >= minCompatibilityScore)
      .sort((a: any, b: any) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, limit);

    return compatibleUsers;
  }

  /**
   * Check if user can be updated by the requesting user
   */
  async canUpdateUser(userId: string, requestingUserId: string, userRepository: IUserRepository): Promise<boolean> {
    // Users can always update themselves
    if (userId === requestingUserId) {
      return true;
    }

    // Check if requesting user is admin
    const requestingUser = await userRepository.findById(requestingUserId);
    return requestingUser ? requestingUser.canAdministrate() : false;
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats(userRepository: IUserRepository): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    topGenres: Array<{ genre: string; count: number }>;
  }> {
    const totalUsers = await userRepository.count();
    
    // This would need more sophisticated implementation with proper date handling
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      totalUsers,
      activeUsers: totalUsers, // Placeholder - would need last login tracking
      newUsersToday: 0, // Placeholder - would need creation date filtering
      topGenres: [] // Placeholder - would need genre aggregation
    };
  }
}
