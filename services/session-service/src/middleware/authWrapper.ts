import { Request, Response, NextFunction } from 'express';
import authMiddleware from '../../../shared/middleware/auth';
import { AuthenticatedRequest } from '../../../shared/types';

/**
 * Wrapper to handle Express type compatibility with shared auth middleware
 */
export const authWrapper = (req: Request, res: Response, next: NextFunction): void => {
  authMiddleware.verifyToken(req as any, res as any, next as any);
};

export const optionalAuthWrapper = (req: Request, res: Response, next: NextFunction): void => {
  authMiddleware.optionalAuth(req as any, res as any, next as any);
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const roleMiddleware = authMiddleware.requireRole(roles);
    roleMiddleware(req as any, res as any, next as any);
  };
};
