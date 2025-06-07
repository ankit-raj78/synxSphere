import { Request, Response, NextFunction } from 'express';
const { body, validationResult } = require('express-validator');

// Room validation rules
export const validateRoomData = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Room name must be between 1 and 100 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('maxParticipants')
    .optional()
    .isInt({ min: 2, max: 100 })
    .withMessage('Max participants must be between 2 and 100'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  
  body('requiresPassword')
    .optional()
    .isBoolean()
    .withMessage('requiresPassword must be a boolean'),
  
  body('password')
    .optional()
    .custom((value: any, { req }: { req: Request }) => {
      if (req.body.requiresPassword && !value) {
        throw new Error('Password is required when requiresPassword is true');
      }
      if (value && value.length < 4) {
        throw new Error('Password must be at least 4 characters long');
      }
      return true;
    }),
  
  body('genres')
    .optional()
    .isArray()
    .withMessage('Genres must be an array'),
  
  body('genres.*')
    .optional()
    .isString()
    .withMessage('Each genre must be a string'),
  
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
  
  body('settings.allowGuestControl')
    .optional()
    .isBoolean()
    .withMessage('allowGuestControl must be a boolean'),
  
  body('settings.autoPlay')
    .optional()
    .isBoolean()
    .withMessage('autoPlay must be a boolean'),
  
  body('settings.requireApproval')
    .optional()
    .isBoolean()
    .withMessage('requireApproval must be a boolean'),
  
  body('settings.chatEnabled')
    .optional()
    .isBoolean()
    .withMessage('chatEnabled must be a boolean'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Session validation rules
export const validateSessionData = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Session name must be between 1 and 100 characters'),
  
  body('roomId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Room ID is required'),
  
  body('maxParticipants')
    .optional()
    .isInt({ min: 2, max: 50 })
    .withMessage('Max participants must be between 2 and 50'),
  
  body('allowGuestControl')
    .optional()
    .isBoolean()
    .withMessage('allowGuestControl must be a boolean'),
  
  body('requireApproval')
    .optional()
    .isBoolean()
    .withMessage('requireApproval must be a boolean'),
  
  body('autoPlay')
    .optional()
    .isBoolean()
    .withMessage('autoPlay must be a boolean'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Session state validation rules
export const validateSessionState = [
  body('currentTrack')
    .optional()
    .isObject()
    .withMessage('currentTrack must be an object'),
  
  body('position')
    .optional()
    .isNumeric()
    .withMessage('Position must be a number'),
  
  body('isPlaying')
    .optional()
    .isBoolean()
    .withMessage('isPlaying must be a boolean'),
  
  body('volume')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Volume must be between 0 and 1'),
  
  body('queue')
    .optional()
    .isArray()
    .withMessage('Queue must be an array'),
  
  body('playbackMode')
    .optional()
    .isIn(['normal', 'repeat', 'shuffle'])
    .withMessage('Playback mode must be normal, repeat, or shuffle'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Generic validation middleware for common patterns
export const validatePagination = [
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  body('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

export const validateUserId = [
  body('userId')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];
