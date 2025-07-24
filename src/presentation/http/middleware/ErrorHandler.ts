import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError, ValidationError } from '../../../shared/errors/AppError';

/**
 * Global error handler middleware
 * Converts all errors to appropriate HTTP responses
 */
export class ErrorHandler {
  /**
   * Express error handling middleware
   */
  static handle(error: Error, req: Request, res: Response, next: NextFunction): void {
    // Log error for debugging
    console.error('Error occurred:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      body: req.body,
      timestamp: new Date().toISOString()
    });

    // Handle application errors
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error instanceof ValidationError && { errors: error.errors })
        }
      });
      return;
    }

    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaError = ErrorHandler.handlePrismaError(error);
      res.status(prismaError.statusCode).json({
        success: false,
        error: prismaError.error
      });
      return;
    }

    // Handle Prisma validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.message
        }
      });
      return;
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token'
        }
      });
      return;
    }

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired'
        }
      });
      return;
    }

    // Handle validation errors from joi, yup, etc.
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        }
      });
      return;
    }

    // Default internal server error
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : error.message
      }
    });
  }

  /**
   * Handle Prisma-specific errors
   */
  private static handlePrismaError(error: Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = error.meta?.target as string[] || ['field'];
        return {
          statusCode: 409,
          error: {
            code: 'DUPLICATE_ENTRY',
            message: `${field.join(', ')} already exists`,
            field: field[0]
          }
        };

      case 'P2025':
        // Record not found
        return {
          statusCode: 404,
          error: {
            code: 'NOT_FOUND',
            message: 'Requested resource not found'
          }
        };

      case 'P2003':
        // Foreign key constraint violation
        return {
          statusCode: 400,
          error: {
            code: 'INVALID_REFERENCE',
            message: 'Referenced resource does not exist'
          }
        };

      case 'P2014':
        // Invalid ID (usually invalid relation)
        return {
          statusCode: 400,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid identifier provided'
          }
        };

      default:
        return {
          statusCode: 500,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Database operation failed'
          }
        };
    }
  }

  /**
   * Handle async route errors
   */
  static asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Handle 404 errors for undefined routes
   */
  static notFound(req: Request, res: Response, next: NextFunction): void {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`
      }
    });
  }
}
