import { injectable } from 'inversify';
import jwt from 'jsonwebtoken';
import { User } from '../../domain/entities/User';

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
}

/**
 * Token service interface
 */
export interface ITokenService {
  generate(user: User): string;
  verify(token: string): TokenPayload | null;
}

/**
 * JWT implementation of token service
 */
@injectable()
export class JWTTokenService implements ITokenService {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor() {
    this.secret = process.env.JWT_SECRET || 'dev-secret-key';
    this.expiresIn = process.env.JWT_EXPIRES_IN || '1h';
  }

  generate(user: User): string {
    const payload = {
      userId: user.getId(),
      email: user.getEmail(),
      username: user.getUsername(),
      role: user.getProfile().getRole(),
    };

    return (jwt as any).sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  verify(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret) as any;
      return {
        userId: decoded.userId,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role,
      };
    } catch (error) {
      return null;
    }
  }
}
