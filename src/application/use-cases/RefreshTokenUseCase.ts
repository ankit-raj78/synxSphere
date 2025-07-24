import { injectable, inject } from 'inversify';
import type { IUserRepository } from '../../domain/repositories/IUserRepository';
import { AuthenticationError } from '../../shared/errors/AppError';
import { RefreshTokenDto, TokenResponseDto } from '../dto/AuthDto';
import { TYPES } from '../../infrastructure/container/types';

/**
 * Use case for refreshing authentication tokens
 */
@injectable()
export class RefreshTokenUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly userRepository: IUserRepository,
    @inject(TYPES.TokenService) private readonly tokenService: any // JWT service
  ) {}

  async execute(dto: RefreshTokenDto): Promise<TokenResponseDto> {
    // Verify refresh token
    let payload: any;
    try {
      payload = await this.tokenService.verifyRefreshToken(dto.refreshToken);
    } catch (error) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Find user to ensure they still exist
    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Generate new tokens
    const tokenPayload = {
      userId: user.getId(),
      email: user.getEmail(),
      username: user.getUsername()
    };

    const accessToken = await this.tokenService.generateAccessToken(tokenPayload);
    const refreshToken = await this.tokenService.generateRefreshToken(tokenPayload);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600 // 1 hour
    };
  }
}
