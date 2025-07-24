import { injectable, inject } from 'inversify';
import bcrypt from 'bcryptjs';
import { User } from '../../domain/entities/User';
import { UserProfile } from '../../domain/value-objects/UserProfile';
import { MusicalPreferences } from '../../domain/value-objects/MusicalPreferences';
import type { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserDomainService } from '../../domain/services/UserDomainService';
import { UserCreatedEvent } from '../../domain/events/UserEvents';
import { CreateUserDto, UserResponseDto } from '../dto/UserDto';
import { UserMapper } from '../mappers/UserMapper';
import { TYPES } from '../../infrastructure/container/types';

/**
 * Use case for creating a new user
 */
@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly userRepository: IUserRepository,
    @inject(TYPES.UserDomainService) private readonly userDomainService: UserDomainService,
    private readonly eventPublisher?: (event: any) => Promise<void>
  ) {}

  async execute(dto: CreateUserDto): Promise<UserResponseDto> {
    // Validate unique email and username
    await this.userDomainService.validateUniqueEmail(dto.email, this.userRepository);
    await this.userDomainService.validateUniqueUsername(dto.username, this.userRepository);

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    // Create musical preferences if provided
    let musicalPreferences: MusicalPreferences | undefined;
    if (dto.profile?.musicalPreferences) {
      musicalPreferences = new MusicalPreferences(dto.profile.musicalPreferences);
    }

    // Create user profile
    const profile = new UserProfile({
      role: 'user', // Always start as regular user
      musicalPreferences,
      bio: dto.profile?.bio,
      avatar: dto.profile?.avatar,
    });

    // Create user entity
    const user = User.create({
      email: dto.email,
      username: dto.username,
      passwordHash,
      profile: {
        role: profile.getRole(),
        musicalPreferences: profile.getMusicalPreferences(),
        bio: profile.getBio(),
        avatar: profile.getAvatar(),
      },
    });

    // Save to repository
    await this.userRepository.save(user);

    // Publish domain event
    if (this.eventPublisher) {
      const event = new UserCreatedEvent(
        user.getId(),
        user.getEmail(),
        user.getUsername(),
        user.getProfile().toPlainObject()
      );
      await this.eventPublisher(event);
    }

    // Return DTO
    return UserMapper.toResponseDto(user);
  }
}
