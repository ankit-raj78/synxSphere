import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { validationResult } from 'express-validator';
import DatabaseManager from '../../../shared/config/database';
import authMiddleware from '../../../shared/middleware/auth';
import { User, UserProfile } from '../../../shared/types';
import { createError } from '../middleware/errorHandler';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuthController');

class AuthController {
  /**
   * User login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password } = req.body;      // Find user by email
      const userResult = await DatabaseManager.executeQuery<User>(
        'SELECT id, email, username, password_hash, profile, created_at, updated_at FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const user = userResult.rows[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash || '');
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Generate JWT token
      const token = authMiddleware.generateToken(user);

      // Create session
      const session = await authMiddleware.createSession(user.id, token);

      // Remove password from response
      const { password_hash, ...userWithoutPassword } = user;

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      res.json({
        message: 'Login successful',
        user: userWithoutPassword,
        token,
        sessionId: session.id
      });

    } catch (error) {
      logger.error('Login error:', error);
      next(createError('Login failed', 500));
    }
  }

  /**
   * User registration
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, username, password, profile } = req.body;

      // Check if user already exists
      const existingUser = await DatabaseManager.executeQuery(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email, username]
      );

      if (existingUser.rows.length > 0) {
        res.status(409).json({ error: 'User already exists with this email or username' });
        return;
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user profile
      const userProfile: UserProfile = {
        role: 'user',
        musicalPreferences: profile?.musicalPreferences || {
          genres: [],
          instruments: [],
          experience: 'beginner',
          collaborationStyle: 'flexible',
          preferredTempo: { min: 60, max: 140 },
          preferredKeys: []
        },
        bio: profile?.bio || '',
        avatar: profile?.avatar || null
      };      // Insert user
      const userResult = await DatabaseManager.executeQuery<User>(
        `INSERT INTO users (id, email, username, password_hash, profile, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, email, username, profile, created_at, updated_at`,
        [uuidv4(), email, username, passwordHash, JSON.stringify(userProfile)]
      );

      const newUser = userResult.rows[0];

      // Generate JWT token
      const token = authMiddleware.generateToken(newUser);

      // Create session
      const session = await authMiddleware.createSession(newUser.id, token);

      logger.info('User registered successfully', { userId: newUser.id, email: newUser.email });

      res.status(201).json({
        message: 'Registration successful',
        user: newUser,
        token,
        sessionId: session.id
      });

    } catch (error) {
      logger.error('Registration error:', error);
      next(createError('Registration failed', 500));
    }
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {    try {
      if (!req.user || !req.sessionId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Get user with created_at from database
      const userResult = await DatabaseManager.executeQuery<User>(
        'SELECT id, email, username, profile, created_at FROM users WHERE id = $1',
        [req.user.id]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Generate new token with complete user data
      const newToken = authMiddleware.generateToken(userResult.rows[0]);

      // Update session with new token
      await DatabaseManager.executeQuery(
        'UPDATE user_sessions SET session_token = $1, updated_at = NOW() WHERE id = $2',
        [newToken, req.sessionId]
      );

      logger.info('Token refreshed', { userId: req.user.id });

      res.json({
        message: 'Token refreshed successfully',
        token: newToken
      });

    } catch (error) {
      logger.error('Token refresh error:', error);
      next(createError('Token refresh failed', 500));
    }
  }

  /**
   * User logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.sessionId) {
        res.status(401).json({ error: 'No active session' });
        return;
      }

      await authMiddleware.revokeSession(req.sessionId);

      logger.info('User logged out', { userId: req.user?.id, sessionId: req.sessionId });

      res.json({ message: 'Logout successful' });

    } catch (error) {
      logger.error('Logout error:', error);
      next(createError('Logout failed', 500));
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Revoke all user sessions
      await DatabaseManager.executeQuery(
        'DELETE FROM user_sessions WHERE user_id = $1',
        [req.user.id]
      );

      logger.info('User logged out from all devices', { userId: req.user.id });

      res.json({ message: 'Logged out from all devices successfully' });

    } catch (error) {
      logger.error('Logout all error:', error);
      next(createError('Logout from all devices failed', 500));
    }
  }

  /**
   * Forgot password - generate reset token
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email } = req.body;

      // Find user
      const userResult = await DatabaseManager.executeQuery<User>(
        'SELECT id, email FROM users WHERE email = $1',
        [email]
      );

      // Always return success to prevent email enumeration
      if (userResult.rows.length === 0) {
        res.json({ message: 'If the email exists, a reset link has been sent' });
        return;
      }

      const user = userResult.rows[0];
      const resetToken = uuidv4();
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token
      await DatabaseManager.executeQuery(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
         token = $2, expires_at = $3, created_at = NOW()`,
        [user.id, resetToken, expiresAt]
      );

      // TODO: Send email with reset link
      logger.info('Password reset requested', { userId: user.id, email: user.email });

      res.json({ message: 'If the email exists, a reset link has been sent' });

    } catch (error) {
      logger.error('Forgot password error:', error);
      next(createError('Password reset request failed', 500));
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { token, password } = req.body;

      // Find valid reset token
      const tokenResult = await DatabaseManager.executeQuery(
        `SELECT prt.user_id, u.email 
         FROM password_reset_tokens prt
         JOIN users u ON prt.user_id = u.id
         WHERE prt.token = $1 AND prt.expires_at > NOW()`,
        [token]
      );

      if (tokenResult.rows.length === 0) {
        res.status(400).json({ error: 'Invalid or expired reset token' });
        return;
      }

      const { user_id: userId, email } = tokenResult.rows[0];

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Update password
      await DatabaseManager.executeQuery(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, userId]
      );

      // Delete reset token
      await DatabaseManager.executeQuery(
        'DELETE FROM password_reset_tokens WHERE user_id = $1',
        [userId]
      );

      // Revoke all existing sessions
      await DatabaseManager.executeQuery(
        'DELETE FROM user_sessions WHERE user_id = $1',
        [userId]
      );

      logger.info('Password reset successful', { userId, email });

      res.json({ message: 'Password reset successful' });

    } catch (error) {
      logger.error('Reset password error:', error);
      next(createError('Password reset failed', 500));
    }
  }
}

export default new AuthController();
