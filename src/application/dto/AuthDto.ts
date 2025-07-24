import { UserResponseDto } from './UserDto';

/**
 * DTO for login request
 */
export interface LoginDto {
  email: string;
  password: string;
}

/**
 * DTO for authentication response
 */
export interface AuthResponseDto {
  user: UserResponseDto;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

/**
 * DTO for refresh token request
 */
export interface RefreshTokenDto {
  refreshToken: string;
}

/**
 * DTO for token response
 */
export interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
