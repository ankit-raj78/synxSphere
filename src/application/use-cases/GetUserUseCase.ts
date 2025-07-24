import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserDomainService } from '../../domain/services/UserDomainService';
import { EntityNotFoundError } from '../../shared/errors/DomainError';
import { 
  UserResponseDto, 
  UserPublicDto, 
  PaginatedUsersDto, 
  FindUsersQuery,
  CompatibilityDto 
} from '../dto/UserDto';
import { UserMapper } from '../mappers/UserMapper';

/**
 * Use case for retrieving a single user by ID
 */
export class GetUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string, includePrivate = false): Promise<UserResponseDto | UserPublicDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundError('User', userId);
    }

    return includePrivate 
      ? UserMapper.toResponseDto(user)
      : UserMapper.toPublicDto(user);
  }
}

/**
 * Use case for retrieving multiple users with filtering and pagination
 */
export class FindUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(query: FindUsersQuery): Promise<PaginatedUsersDto> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 50); // Max 50 users per page

    const result = await this.userRepository.findMany({
      page,
      limit,
      search: query.search,
      role: query.role,
    });

    return UserMapper.toPaginatedDto(result.users, result.total, page, limit);
  }
}

/**
 * Use case for finding users with similar musical preferences
 */
export class FindCompatibleUsersUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly userDomainService: UserDomainService
  ) {}

  async execute(
    userId: string,
    options: {
      minCompatibilityScore?: number;
      limit?: number;
    } = {}
  ): Promise<CompatibilityDto[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundError('User', userId);
    }

    const compatibleUsers = await this.userDomainService.findCompatibleUsers(user, this.userRepository, options);
    
    return compatibleUsers.map(({ user: compatibleUser, compatibilityScore }) => ({
      userId: compatibleUser.getId(),
      username: compatibleUser.getUsername(),
      overallScore: compatibilityScore,
      breakdown: user.calculateCompatibilityWith(compatibleUser).breakdown,
    }));
  }
}

/**
 * Use case for calculating compatibility between two specific users
 */
export class CalculateUserCompatibilityUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId1: string, userId2: string): Promise<CompatibilityDto> {
    const [user1, user2] = await Promise.all([
      this.userRepository.findById(userId1),
      this.userRepository.findById(userId2),
    ]);

    if (!user1) {
      throw new EntityNotFoundError('User', userId1);
    }
    if (!user2) {
      throw new EntityNotFoundError('User', userId2);
    }

    const compatibility = user1.calculateCompatibilityWith(user2);
    
    return {
      userId: user2.getId(),
      username: user2.getUsername(),
      overallScore: compatibility.overallScore,
      breakdown: compatibility.breakdown
    };
  }
}

/**
 * Use case for searching users by musical preferences
 */
export class SearchUsersByPreferencesUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(preferences: {
    genres?: string[];
    instruments?: string[];
    experience?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
    collaborationStyle?: 'leader' | 'follower' | 'flexible';
    limit?: number;
  }): Promise<UserPublicDto[]> {
    const users = await this.userRepository.findByMusicalPreferences(preferences);
    const limit = Math.min(preferences.limit || 20, 50);
    
    return users
      .slice(0, limit)
      .map(user => UserMapper.toPublicDto(user));
  }
}
