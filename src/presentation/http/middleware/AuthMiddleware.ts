import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError } from '../../../shared/errors/AppError';

/**
 * Interface for authenticated user
 */
interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
}

/**
 * Extend Express Request to include user
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT tokens and adds user info to request
 */
export class AuthMiddleware {
  /**
   * Middleware to verify JWT token
   */
  static authenticate(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('Authentication token required');
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      if (!token) {
        throw new AuthenticationError('Authentication token required');
      }

      // Verify token
      const secret = process.env.JWT_SECRET || 'default-secret';
      const decoded = jwt.verify(token, secret) as any;
      
      // Add user info to request
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        username: decoded.username
      };

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        next(new AuthenticationError('Invalid authentication token'));
      } else if (error instanceof jwt.TokenExpiredError) {
        next(new AuthenticationError('Authentication token has expired'));
      } else {
        next(error);
      }
    }
  }

  /**
   * Optional authentication middleware
   * Adds user info if token is present, but doesn't require it
   */
  static optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(); // No token, continue without user
      }

      const token = authHeader.substring(7);
      
      if (!token) {
        return next(); // No token, continue without user
      }

      // Verify token
      const secret = process.env.JWT_SECRET || 'default-secret';
      const decoded = jwt.verify(token, secret) as any;
      
      // Add user info to request
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        username: decoded.username
      };

      next();
    } catch (error) {
      // Token invalid, continue without user (don't throw error)
      next();
    }
  }

  /**
   * Admin-only middleware
   * Requires authentication and admin role
   */
  static requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    // In a real implementation, you'd check the user's role from the database
    // For now, we'll just check if it's in the token (not recommended for production)
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);
    
    if (!token) {
      throw new AuthenticationError('Authentication required');
    }

    try {
      const secret = process.env.JWT_SECRET || 'default-secret';
      const decoded = jwt.verify(token, secret) as any;
      
      if (decoded.role !== 'admin') {
        throw new AuthenticationError('Admin access required');
      }

      next();
    } catch (error) {
      throw new AuthenticationError('Invalid authentication token');
    }
  }
}
