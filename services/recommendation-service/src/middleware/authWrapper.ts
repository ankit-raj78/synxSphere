import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../shared/types';

// Type-safe wrapper for authentication middleware
export const authWrapper = (
  middleware: (req: any, res: any, next: any) => void
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req as any, res as any, next as any);
  };
};

// Extend Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        profile: any;
      };
      sessionId?: string;
      sessionToken?: string;
    }
  }
}
