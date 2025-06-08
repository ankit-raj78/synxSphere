import { Request, Response, NextFunction } from 'express';

interface ValidationError {
  param: string;
  message: string;
}

// Simple validation helper functions
const isString = (value: any): boolean => typeof value === 'string' && value.trim().length > 0;
const isInEnum = (value: any, options: string[]): boolean => options.includes(value);
const isInteger = (value: any, min?: number, max?: number): boolean => {
  const num = Number(value);
  const valid = !isNaN(num) && Number.isInteger(num);
  if (!valid) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
};
const isBoolean = (value: any): boolean => value === 'true' || value === 'false' || value === true || value === false;

// Base validation middleware
const validate = (req: Request, res: Response, next: NextFunction, errors: ValidationError[]) => {
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  next();
};

// Recommendation validation
export const validateRecommendationRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors: ValidationError[] = [];
  const { userId } = req.params;
  const { type, limit } = req.query;
  
  if (!isString(userId)) {
    errors.push({ param: 'userId', message: 'User ID is required' });
  }
  
  if (type !== undefined && !isInEnum(type, ['rooms', 'users', 'collaborators'])) {
    errors.push({ param: 'type', message: 'Invalid recommendation type' });
  }
  
  if (limit !== undefined && !isInteger(limit, 1, 100)) {
    errors.push({ param: 'limit', message: 'Limit must be between 1 and 100' });
  }
  
  validate(req, res, next, errors);
};

// Compatibility validation
export const validateCompatibilityRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors: ValidationError[] = [];
  const { userId1, userId2 } = req.params;
  
  if (!isString(userId1)) {
    errors.push({ param: 'userId1', message: 'First user ID is required' });
  }
  
  if (!isString(userId2)) {
    errors.push({ param: 'userId2', message: 'Second user ID is required' });
  }
  
  validate(req, res, next, errors);
};

// Room recommendation validation
export const validateRoomRecommendationRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors: ValidationError[] = [];
  const { userId } = req.params;
  const { limit, excludeJoined } = req.query;
  
  if (!isString(userId)) {
    errors.push({ param: 'userId', message: 'User ID is required' });
  }
  
  if (limit !== undefined && !isInteger(limit, 1, 50)) {
    errors.push({ param: 'limit', message: 'Limit must be between 1 and 50' });
  }
  
  if (excludeJoined !== undefined && !isBoolean(excludeJoined)) {
    errors.push({ param: 'excludeJoined', message: 'excludeJoined must be boolean' });
  }
  
  validate(req, res, next, errors);
};

// ML Training validation
export const validateMLTrainingRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors: ValidationError[] = [];
  const { datasetSize, algorithm } = req.body;
  
  if (datasetSize !== undefined && !isInteger(datasetSize, 100)) {
    errors.push({ param: 'datasetSize', message: 'Dataset size must be at least 100' });
  }
  
  if (algorithm !== undefined && !isInEnum(algorithm, ['kmeans', 'collaborative-filtering', 'neural-network'])) {
    errors.push({ param: 'algorithm', message: 'Invalid algorithm' });
  }
  
  validate(req, res, next, errors);
};
