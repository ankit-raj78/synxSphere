import * as jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import DatabaseManager from '../config/database';
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
      const userResult = await DatabaseManager.executeQuery<User>(
        'SELECT id, email, username, profile, created_at, updated_at FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      // Check if session is still valid
      const sessionResult = await DatabaseManager.executeQuery<UserSession>(
        'SELECT * FROM user_sessions WHERE user_id = $1 AND session_token = $2 AND expires_at > NOW()',
        [decoded.userId, token]
      );

      if (sessionResult.rows.length === 0) {
        res.status(401).json({ error: 'Session expired' });
        return;
      }

      // Attach user and session info to request
      const authReq = req as unknown as AuthenticatedRequest;
      authReq.user = userResult.rows[0];
      authReq.sessionId = sessionResult.rows[0].id;
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
    
    const result = await DatabaseManager.executeQuery<UserSession>(
      `INSERT INTO user_sessions (user_id, session_token, expires_at, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, token, expiresAt, {}]
    );

    return result.rows[0];
  }

  /**
   * Revoke user session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await DatabaseManager.executeQuery(
      'DELETE FROM user_sessions WHERE id = $1',
      [sessionId]
    );
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await DatabaseManager.executeQuery(
      'DELETE FROM user_sessions WHERE expires_at < NOW()'
    );
    
    return result.rowCount || 0;
  }
}

export default new AuthMiddleware();
