import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserDomainService } from '../../domain/services/UserDomainService';
import { UserProfileUpdatedEvent, MusicalPreferencesUpdatedEvent } from '../../domain/events/UserEvents';
import { EntityNotFoundError, InsufficientPermissionsError } from '../../shared/errors/DomainError';
import { UpdateUserDto, UserResponseDto, UpdateMusicalPreferencesDto } from '../dto/UserDto';
import { UserMapper } from '../mappers/UserMapper';

/**
 * Use case for updating user information
 */
export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly userDomainService: UserDomainService,
    private readonly eventPublisher?: (event: any) => Promise<void>
  ) {}

  async execute(
    userId: string,
    dto: UpdateUserDto,
    requestingUserId: string
  ): Promise<UserResponseDto> {
    // Find the user to update
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundError('User', userId);
    }

    // Find the requesting user for permission check
    const requestingUser = await this.userRepository.findById(requestingUserId);
    if (!requestingUser) {
      throw new EntityNotFoundError('User', requestingUserId);
    }

    // Check permissions
    if (!requestingUser.canEditUser(user)) {
      throw new InsufficientPermissionsError('update user profile');
    }

    // Store old values for events
    const oldEmail = dto.email ? user.getEmail() : undefined;
    const oldUsername = dto.username ? user.getUsername() : undefined;
    const oldProfile = dto.profile ? user.getProfile().toPlainObject() : undefined;

    // Update email if provided
    if (dto.email && dto.email !== user.getEmail()) {
      await this.userDomainService.validateUniqueEmail(dto.email, this.userRepository);
      user.changeEmail(dto.email);
    }

    // Update username if provided
    if (dto.username && dto.username !== user.getUsername()) {
      await this.userDomainService.validateUniqueUsername(dto.username, this.userRepository);
      user.changeUsername(dto.username);
    }

    // Update profile if provided
    if (dto.profile) {
      let musicalPreferences = user.getProfile().getMusicalPreferences();
      
      if (dto.profile.musicalPreferences) {
        musicalPreferences = UserMapper.createMusicalPreferences(dto.profile.musicalPreferences);
      }

      user.updateProfile({
        musicalPreferences,
        bio: dto.profile.bio,
        avatar: dto.profile.avatar,
      });
    }

    // Save updated user
    await this.userRepository.save(user);

    // Publish events
    if (this.eventPublisher) {
      const changes: any = {};
      
      if (oldEmail) {
        changes.email = { old: oldEmail, new: user.getEmail() };
      }
      if (oldUsername) {
        changes.username = { old: oldUsername, new: user.getUsername() };
      }
      if (oldProfile) {
        changes.profile = { old: oldProfile, new: user.getProfile().toPlainObject() };
      }

      if (Object.keys(changes).length > 0) {
        const event = new UserProfileUpdatedEvent(userId, changes);
        await this.eventPublisher(event);
      }
    }

    return UserMapper.toResponseDto(user);
  }
}

/**
 * Use case specifically for updating musical preferences
 */
export class UpdateMusicalPreferencesUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventPublisher?: (event: any) => Promise<void>
  ) {}

  async execute(
    userId: string,
    dto: UpdateMusicalPreferencesDto,
    requestingUserId: string
  ): Promise<UserResponseDto> {
    // Find the user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundError('User', userId);
    }

    // Check permissions (users can only update their own preferences)
    if (userId !== requestingUserId) {
      throw new InsufficientPermissionsError('update musical preferences');
    }

    // Store old preferences for event
    const oldPreferences = user.getProfile().getMusicalPreferences().toPlainObject();

    // Update musical preferences
    user.updateMusicalPreferences(dto);

    // Save updated user
    await this.userRepository.save(user);

    // Publish event
    if (this.eventPublisher) {
      const newPreferences = user.getProfile().getMusicalPreferences().toPlainObject();
      const event = new MusicalPreferencesUpdatedEvent(userId, oldPreferences, newPreferences);
      await this.eventPublisher(event);
    }

    return UserMapper.toResponseDto(user);
  }
}
