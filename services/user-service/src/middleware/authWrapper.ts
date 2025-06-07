import { Request, Response, NextFunction, RequestHandler } from 'express';
import authMiddleware from '../../../shared/middleware/auth';

// Wrapper to handle type compatibility
export const verifyToken: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  return authMiddleware.verifyToken(req as any, res as any, next);
};

export const requireRole = (roles: string[]): RequestHandler => {
  const roleMiddleware = authMiddleware.requireRole(roles);
  return (req: Request, res: Response, next: NextFunction) => {
    return roleMiddleware(req as any, res as any, next);
  };
};

export const optionalAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  return authMiddleware.optionalAuth(req as any, res as any, next);
};
