import * as jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../lib/prisma';
import { User, UserSession, AuthenticatedRequest } from '../types';

export interface AuthTokenPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

class AuthMiddleware {
  /**
   * Middleware to verify JWT token and attach user to request
   */
  async verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No valid token provided' });
        return;
      }

      const token = authHeader.substring(7);
      const jwtSecret = process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        console.error('JWT_SECRET environment variable not set');
        res.status(500).json({ error: 'Server configuration error' });
        return;
      }

      const decoded = jwt.verify(token, jwtSecret) as AuthTokenPayload;
      
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          username: true,
          profile: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      // Check if session is still valid
      const session = await prisma.userSession.findFirst({
        where: {
          userId: decoded.userId,
          token: token,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      if (!session) {
        res.status(401).json({ error: 'Session expired' });
        return;
      }

      // Attach user and session info to request
      const authReq = req as unknown as AuthenticatedRequest;
      authReq.user = user as any; // Type conversion needed due to camelCase vs snake_case
      authReq.sessionId = session.id;
      authReq.sessionToken = token;
      
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({ error: 'Invalid token format' });
      } else if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({ error: 'Token expired' });
      } else {
        res.status(401).json({ error: 'Authentication failed' });
      }
    }
  }

  /**
   * Middleware to require specific user roles
   */
  requireRole(roles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const authReq = req as unknown as AuthenticatedRequest;
      if (!authReq.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const userRole = authReq.user.profile?.role || 'user';
      if (!roles.includes(userRole)) {
        res.status(403).json({ 
          error: 'Insufficient permissions',
          required: roles,
          current: userRole
        });
        return;
      }

      next();
    };
  }

  /**
   * Optional authentication middleware - doesn't fail if no token provided
   */
  async optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    try {
      await this.verifyToken(req, res, next);
    } catch (error) {
      // Don't fail on optional auth - just continue without user
      console.warn('Optional auth failed:', error);
      next();
    }
  }

  /**
   * Generate JWT token for user
   */
  generateToken(user: User, expiresIn: string = '24h'): string {
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable not set');
    }

    const payload: AuthTokenPayload = {
      userId: user.id,
      username: user.username
    };

    return jwt.sign(payload, jwtSecret, { expiresIn } as jwt.SignOptions);
  }

  /**
   * Create user session in database
   */
  async createSession(userId: string, token: string, expiresIn: number = 24 * 60 * 60 * 1000): Promise<UserSession> {
    const expiresAt = new Date(Date.now() + expiresIn);
    
    const result = await prisma.userSession.create({
      data: {
        userId: userId,
        token: token,
        expiresAt: expiresAt
      }
    });

    return result as any; // Type conversion needed due to camelCase vs snake_case
  }

  /**
   * Revoke user session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await prisma.userSession.delete({
      where: { id: sessionId }
    });
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
    
    return result.count;
  }
}

export default new AuthMiddleware();
