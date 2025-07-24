import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { CreateUserUseCase } from '../../../application/use-cases/CreateUserUseCase';
import { LoginUseCase } from '../../../application/use-cases/LoginUseCase';
import { RefreshTokenUseCase } from '../../../application/use-cases/RefreshTokenUseCase';
import { ValidationError } from '../../../shared/errors/AppError';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { TYPES } from '../../../infrastructure/container/types';

/**
 * Clean controller handling only HTTP concerns for authentication
 * Business logic is delegated to use cases
 */
@injectable()
export class AuthController {
  constructor(
    @inject(TYPES.CreateUserUseCase) private readonly createUserUseCase: CreateUserUseCase,
    @inject(TYPES.LoginUseCase) private readonly loginUseCase: LoginUseCase,
    @inject(TYPES.RefreshTokenUseCase) private readonly refreshTokenUseCase: RefreshTokenUseCase
  ) {}

  /**
   * Register a new user
   */
  register = ErrorHandler.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Basic input validation
    this.validateRegisterInput(req.body);

    const result = await this.createUserUseCase.execute({
      email: req.body.email,
      username: req.body.username,
      password: req.body.password,
      profile: req.body.profile
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: result
    });
  });

  /**
   * Login user
   */
  login = ErrorHandler.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Basic input validation
    this.validateLoginInput(req.body);

    const result = await this.loginUseCase.execute({
      email: req.body.email,
      password: req.body.password
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  });

  /**
   * Refresh authentication tokens
   */
  refreshToken = ErrorHandler.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Basic input validation
    if (!req.body.refreshToken) {
      throw new ValidationError('Refresh token is required', [
        { field: 'refreshToken', message: 'Refresh token is required' }
      ]);
    }

    const result = await this.refreshTokenUseCase.execute({
      refreshToken: req.body.refreshToken
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: result
    });
  });

  /**
   * Logout user (invalidate tokens - if implementing token blacklist)
   */
  logout = ErrorHandler.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // In a full implementation, you might blacklist the token
    // For now, we'll just return success as client should discard tokens
    res.json({
      success: true,
      message: 'Logout successful'
    });
  });

  /**
   * Validate register input
   */
  private validateRegisterInput(body: any): void {
    const errors: any[] = [];

    if (!body.email) {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (!this.isValidEmail(body.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    if (!body.username) {
      errors.push({ field: 'username', message: 'Username is required' });
    } else if (body.username.length < 3) {
      errors.push({ field: 'username', message: 'Username must be at least 3 characters' });
    }

    if (!body.password) {
      errors.push({ field: 'password', message: 'Password is required' });
    } else if (body.password.length < 6) {
      errors.push({ field: 'password', message: 'Password must be at least 6 characters' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid registration data', errors);
    }
  }

  /**
   * Validate login input
   */
  private validateLoginInput(body: any): void {
    const errors: any[] = [];

    if (!body.email) {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (!this.isValidEmail(body.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    if (!body.password) {
      errors.push({ field: 'password', message: 'Password is required' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid login data', errors);
    }
  }

  /**
   * Simple email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
