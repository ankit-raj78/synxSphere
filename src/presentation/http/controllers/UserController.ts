import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { GetUserUseCase } from '../../../application/use-cases/GetUserUseCase';
import { UpdateUserUseCase } from '../../../application/use-cases/UpdateUserUseCase';
import { ValidationError, NotFoundError } from '../../../shared/errors/AppError';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { TYPES } from '../../../infrastructure/container/types';

/**
 * Clean controller handling only HTTP concerns for user management
 * Business logic is delegated to use cases
 */
@injectable()
export class UserController {
  constructor(
    @inject(TYPES.GetUserUseCase) private readonly getUserUseCase: GetUserUseCase,
    @inject(TYPES.UpdateUserUseCase) private readonly updateUserUseCase: UpdateUserUseCase
  ) {}

  /**
   * Get user by ID
   */
  getUser = ErrorHandler.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.id;
    
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const user = await this.getUserUseCase.execute(userId, false); // Public only

    res.json({
      success: true,
      data: user
    });
  });

  /**
   * Get current user profile
   */
  getCurrentUser = ErrorHandler.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Assuming user ID is set by authentication middleware
    const userId = (req as any).user?.id;
    
    if (!userId) {
      throw new ValidationError('Authentication required');
    }

    const user = await this.getUserUseCase.execute(userId, true); // Include private info

    res.json({
      success: true,
      data: user
    });
  });

  /**
   * Update user profile
   */
  updateUser = ErrorHandler.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.id;
    const currentUserId = (req as any).user?.id;
    
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Basic validation
    this.validateUpdateInput(req.body);

    const updatedUser = await this.updateUserUseCase.execute(
      userId,
      {
        username: req.body.username,
        profile: req.body.profile
      },
      currentUserId
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  });

  /**
   * Update current user's profile
   */
  updateCurrentUser = ErrorHandler.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      throw new ValidationError('Authentication required');
    }

    // Basic validation
    this.validateUpdateInput(req.body);

    const updatedUser = await this.updateUserUseCase.execute(
      userId,
      {
        username: req.body.username,
        profile: req.body.profile
      },
      userId // Same user
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  });

  /**
   * Get user's public profile
   */
  getPublicProfile = ErrorHandler.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.id;
    
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const user = await this.getUserUseCase.execute(userId, false); // Public only

    res.json({
      success: true,
      data: user
    });
  });

  /**
   * Search users by musical preferences or username
   */
  searchUsers = ErrorHandler.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { query, genres, instruments, skillLevel } = req.query;

    // This would typically be handled by a SearchUsersUseCase
    // For now, we'll return a placeholder
    res.json({
      success: true,
      message: 'Search functionality to be implemented',
      data: {
        query: { query, genres, instruments, skillLevel },
        results: []
      }
    });
  });

  /**
   * Validate update input
   */
  private validateUpdateInput(body: any): void {
    const errors: any[] = [];

    if (body.username !== undefined) {
      if (typeof body.username !== 'string' || body.username.length < 3) {
        errors.push({ field: 'username', message: 'Username must be at least 3 characters' });
      }
    }

    if (body.profile !== undefined) {
      if (typeof body.profile !== 'object') {
        errors.push({ field: 'profile', message: 'Profile must be an object' });
      } else {
        if (body.profile.bio !== undefined && typeof body.profile.bio !== 'string') {
          errors.push({ field: 'profile.bio', message: 'Bio must be a string' });
        }
        
        if (body.profile.avatar !== undefined && typeof body.profile.avatar !== 'string') {
          errors.push({ field: 'profile.avatar', message: 'Avatar must be a string URL' });
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid update data', errors);
    }
  }
}
