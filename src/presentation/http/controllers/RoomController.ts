import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { CreateRoomUseCase } from '../../../application/use-cases/CreateRoomUseCase';
import { JoinRoomUseCase } from '../../../application/use-cases/JoinRoomUseCase';
import { GetRoomUseCase } from '../../../application/use-cases/room/GetRoomUseCase';
import { ValidationError, AuthenticationError } from '../../../shared/errors/AppError';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { TYPES } from '../../../infrastructure/container/types';

/**
 * Clean controller handling only HTTP concerns for room management
 * Business logic is delegated to use cases
 */
@injectable()
export class RoomController {
  constructor(
    @inject(TYPES.CreateRoomUseCase) private readonly createRoomUseCase: CreateRoomUseCase,
    @inject(TYPES.JoinRoomUseCase) private readonly joinRoomUseCase: JoinRoomUseCase,
    @inject(TYPES.GetRoomUseCase) private readonly getRoomUseCase: GetRoomUseCase
  ) {}

  /**
   * Create a new room
   */
  createRoom = ErrorHandler.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    // Basic validation
    this.validateCreateRoomInput(req.body);

    const room = await this.createRoomUseCase.execute({
      name: req.body.name,
      description: req.body.description,
      genre: req.body.genre,
      settings: req.body.settings
    }, userId);

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: room
    });
  });

  /**
   * Get room by ID
   */
  getRoom = ErrorHandler.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const roomId = req.params.id;
    const userId = (req as any).user?.id;
    
    if (!roomId) {
      throw new ValidationError('Room ID is required');
    }

    const room = await this.getRoomUseCase.execute(roomId);

    res.json({
      success: true,
      data: room
    });
  });

  /**
   * Join a room
   */
  joinRoom = ErrorHandler.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const roomId = req.params.id;
    const userId = (req as any).user?.id;
    
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    if (!roomId) {
      throw new ValidationError('Room ID is required');
    }

    const result = await this.joinRoomUseCase.execute({
      roomId,
      userId
    });

    res.json({
      success: true,
      message: 'Successfully joined room',
      data: result
    });
  });

  /**
   * Leave a room
   */
  leaveRoom = ErrorHandler.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const roomId = req.params.id;
    const userId = (req as any).user?.id;
    
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    if (!roomId) {
      throw new ValidationError('Room ID is required');
    }

    // This would typically be handled by a LeaveRoomUseCase
    // For now, we'll return a placeholder
    res.json({
      success: true,
      message: 'Successfully left room',
      data: { roomId, userId }
    });
  });

  /**
   * Get all rooms (with filtering)
   */
  getRooms = ErrorHandler.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { page = 1, limit = 10, genre, search, isPrivate } = req.query;
    
    // This would typically be handled by a GetRoomsUseCase
    // For now, we'll return a placeholder
    res.json({
      success: true,
      data: {
        rooms: [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 0,
          totalPages: 0
        },
        filters: { genre, search, isPrivate }
      }
    });
  });

  /**
   * Get room participants
   */
  getRoomParticipants = ErrorHandler.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const roomId = req.params.id;
    const userId = (req as any).user?.id;
    
    if (!roomId) {
      throw new ValidationError('Room ID is required');
    }

    // This would typically be handled by a GetRoomParticipantsUseCase
    // For now, we'll return a placeholder
    res.json({
      success: true,
      data: {
        roomId,
        participants: []
      }
    });
  });

  /**
   * Update room settings (room owner only)
   */
  updateRoom = ErrorHandler.asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const roomId = req.params.id;
    const userId = (req as any).user?.id;
    
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    if (!roomId) {
      throw new ValidationError('Room ID is required');
    }

    // Basic validation
    this.validateUpdateRoomInput(req.body);

    // This would typically be handled by an UpdateRoomUseCase
    // For now, we'll return a placeholder
    res.json({
      success: true,
      message: 'Room updated successfully',
      data: {
        roomId,
        updates: req.body
      }
    });
  });

  /**
   * Validate create room input
   */
  private validateCreateRoomInput(body: any): void {
    const errors: any[] = [];

    if (!body.name) {
      errors.push({ field: 'name', message: 'Room name is required' });
    } else if (body.name.length < 3) {
      errors.push({ field: 'name', message: 'Room name must be at least 3 characters' });
    }

    if (body.maxParticipants !== undefined) {
      if (!Number.isInteger(body.maxParticipants) || body.maxParticipants < 2 || body.maxParticipants > 50) {
        errors.push({ field: 'maxParticipants', message: 'Max participants must be between 2 and 50' });
      }
    }

    if (body.genres !== undefined) {
      if (!Array.isArray(body.genres)) {
        errors.push({ field: 'genres', message: 'Genres must be an array' });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid room creation data', errors);
    }
  }

  /**
   * Validate update room input
   */
  private validateUpdateRoomInput(body: any): void {
    const errors: any[] = [];

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.length < 3) {
        errors.push({ field: 'name', message: 'Room name must be at least 3 characters' });
      }
    }

    if (body.description !== undefined) {
      if (typeof body.description !== 'string') {
        errors.push({ field: 'description', message: 'Description must be a string' });
      }
    }

    if (body.maxParticipants !== undefined) {
      if (!Number.isInteger(body.maxParticipants) || body.maxParticipants < 2 || body.maxParticipants > 50) {
        errors.push({ field: 'maxParticipants', message: 'Max participants must be between 2 and 50' });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid room update data', errors);
    }
  }
}
