import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('ErrorHandler');

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let { statusCode = 500, message } = error;

  if (process.env.NODE_ENV !== 'production') {
    logger.error('Error details:', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query
    });
  } else {
    logger.error('Error occurred:', {
      error: error.message,
      path: req.path,
      method: req.method,
      statusCode
    });
  }

  // Don't leak error details in production
  if (!error.isOperational && process.env.NODE_ENV === 'production') {
    message = 'Something went wrong';
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: error.stack,
      details: error 
    })
  });
};
