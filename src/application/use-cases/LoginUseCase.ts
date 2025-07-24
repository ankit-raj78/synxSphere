import { injectable, inject } from 'inversify';
import bcrypt from 'bcryptjs';
import type { IUserRepository } from '../../domain/repositories/IUserRepository';
import { AuthenticationError, NotFoundError } from '../../shared/errors/AppError';
import { LoginDto, AuthResponseDto } from '../dto/AuthDto';
import { UserMapper } from '../mappers/UserMapper';
import { TYPES } from '../../infrastructure/container/types';

/**
 * Use case for user login/authentication
 */
@injectable()
export class LoginUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly userRepository: IUserRepository,
    @inject(TYPES.TokenService) private readonly tokenService: any // JWT service
  ) {}

  async execute(dto: LoginDto): Promise<AuthResponseDto> {
    // Find user by email
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.getPasswordHash());
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate tokens
    const payload = {
      userId: user.getId(),
      email: user.getEmail(),
      username: user.getUsername()
    };

    const accessToken = await this.tokenService.generateAccessToken(payload);
    const refreshToken = await this.tokenService.generateRefreshToken(payload);

    // Update last login
    user.updateLastLogin();
    await this.userRepository.save(user);

    return {
      user: UserMapper.toResponseDto(user),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 3600 // 1 hour
      }
    };
  }
}
