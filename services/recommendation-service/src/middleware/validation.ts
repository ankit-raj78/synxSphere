import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

export const validateRecommendationRequest = [
  param('userId').isString().notEmpty().withMessage('User ID is required'),
  query('type').optional().isIn(['rooms', 'users', 'collaborators']).withMessage('Invalid recommendation type'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validate
];

export const validateCompatibilityRequest = [
  param('userId1').isString().notEmpty().withMessage('First user ID is required'),
  param('userId2').isString().notEmpty().withMessage('Second user ID is required'),
  validate
];

export const validateRoomRecommendationRequest = [
  param('userId').isString().notEmpty().withMessage('User ID is required'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('excludeJoined').optional().isBoolean().withMessage('excludeJoined must be boolean'),
  validate
];

export const validateMLTrainingRequest = [
  body('datasetSize').optional().isInt({ min: 100 }).withMessage('Dataset size must be at least 100'),
  body('algorithm').optional().isIn(['kmeans', 'collaborative-filtering', 'neural-network']).withMessage('Invalid algorithm'),
  validate
];
