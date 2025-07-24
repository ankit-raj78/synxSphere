import { User } from '../../domain/entities/User';
import { MusicalPreferences } from '../../domain/value-objects/MusicalPreferences';
import {
  UserResponseDto,
  UserPublicDto,
  CompatibilityDto,
  PaginatedUsersDto,
} from '../dto/UserDto';

/**
 * Mapper class to convert between User domain entities and DTOs
 */
export class UserMapper {
  /**
   * Convert User entity to full response DTO (includes email)
   */
  static toResponseDto(user: User): UserResponseDto {
    const profile = user.getProfile();
    const musicalPrefs = profile.getMusicalPreferences();

    return {
      id: user.getId(),
      email: user.getEmail(),
      username: user.getUsername(),
      profile: {
        role: profile.getRole(),
        bio: profile.getBio(),
        avatar: profile.getAvatar(),
        musicalPreferences: {
          genres: [...musicalPrefs.getGenres()],
          instruments: [...musicalPrefs.getInstruments()],
          experience: musicalPrefs.getExperience(),
          collaborationStyle: musicalPrefs.getCollaborationStyle(),
          preferredTempo: { ...musicalPrefs.getPreferredTempo() },
          preferredKeys: [...musicalPrefs.getPreferredKeys()],
        },
      },
      createdAt: user.getCreatedAt(),
      updatedAt: user.getUpdatedAt(),
    };
  }

  /**
   * Convert User entity to public DTO (excludes email)
   */
  static toPublicDto(user: User): UserPublicDto {
    const publicInfo = user.getPublicInfo();
    
    return {
      id: publicInfo.id,
      username: publicInfo.username,
      profile: {
        role: publicInfo.profile.role,
        bio: publicInfo.profile.bio,
        avatar: publicInfo.profile.avatar,
        musicalPreferences: {
          genres: publicInfo.profile.musicalPreferences.genres,
          instruments: publicInfo.profile.musicalPreferences.instruments,
          experience: publicInfo.profile.musicalPreferences.experience,
          collaborationStyle: publicInfo.profile.musicalPreferences.collaborationStyle,
          preferredTempo: publicInfo.profile.musicalPreferences.preferredTempo,
          preferredKeys: publicInfo.profile.musicalPreferences.preferredKeys,
        },
      },
      createdAt: publicInfo.createdAt,
    };
  }

  /**
   * Convert from persistence layer to domain entity
   */
  static toDomain(data: {
    id: string;
    email: string;
    username: string;
    password: string;
    profile: any;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return User.fromPersistence({
      id: data.id,
      email: data.email,
      username: data.username,
      passwordHash: data.password,
      profile: data.profile,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  /**
   * Convert domain entity to persistence format
   */
  static toPersistence(user: User): {
    id: string;
    email: string;
    username: string;
    passwordHash: string;
    profile: object;
    createdAt: Date;
    updatedAt: Date;
  } {
    return user.toPersistence();
  }

  /**
   * Convert paginated users to DTO
   */
  static toPaginatedDto(
    users: User[],
    total: number,
    page: number,
    limit: number
  ): PaginatedUsersDto {
    const totalPages = Math.ceil(total / limit);
    
    return {
      users: users.map(user => this.toPublicDto(user)),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasMore: page < totalPages,
      },
    };
  }

  /**
   * Create MusicalPreferences value object from DTO data
   */
  static createMusicalPreferences(data?: {
    genres?: string[];
    instruments?: string[];
    experience?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
    collaborationStyle?: 'leader' | 'follower' | 'flexible';
    preferredTempo?: { min: number; max: number };
    preferredKeys?: string[];
  }): MusicalPreferences {
    return new MusicalPreferences(data);
  }

  /**
   * Convert array of compatible users to DTOs
   */
  static toCompatibilityDtos(
    compatibleUsers: Array<{
      user: User;
      compatibilityScore: number;
    }>
  ): CompatibilityDto[] {
    return compatibleUsers.map(({ user, compatibilityScore }) => ({
      userId: user.getId(),
      username: user.getUsername(),
      overallScore: compatibilityScore,
      breakdown: {
        genreCompatibility: 0, // Would need to recalculate or store breakdown
        instrumentCompatibility: 0,
        experienceCompatibility: 0,
        tempoCompatibility: 0,
        collaborationStyleCompatibility: 0,
      },
    }));
  }
}
