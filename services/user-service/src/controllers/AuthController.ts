import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
const { validationResult } = require('express-validator');
import { prisma } from '../../../../lib/prisma';
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

      const { email, password } = req.body;
      
      // Find user by email using Prisma
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          username: true,
          password: true,
          profile: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password || '');
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Generate JWT token (convert Prisma types to expected format)
      const userForToken = {
        ...user,
        created_at: user.createdAt,
        password_hash: user.password
      } as any;
      const token = authMiddleware.generateToken(userForToken);

      // Create session
      const session = await authMiddleware.createSession(user.id, token);

      // Remove password from response
      const { password: userPassword, ...userWithoutPassword } = user;

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

      // Check if user already exists using Prisma
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email },
            { username: username }
          ]
        },
        select: { id: true }
      });

      if (existingUser) {
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
      };
      
      // Insert user using Prisma
      const newUser = await prisma.user.create({
        data: {
          id: uuidv4(),
          email: email,
          username: username,
          password: passwordHash,
          profile: userProfile as any // Type conversion needed for JSON field
        },
        select: {
          id: true,
          email: true,
          username: true,
          profile: true,
          createdAt: true,
          updatedAt: true
        }
      });

      // Generate JWT token (convert Prisma types to expected format)
      const userForToken = {
        ...newUser,
        created_at: newUser.createdAt
      } as any;
      const token = authMiddleware.generateToken(userForToken);

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
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.sessionId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Get user from database using Prisma
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          username: true,
          profile: true,
          createdAt: true
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Generate new token with complete user data (convert types)
      const userForToken = {
        ...user,
        created_at: user.createdAt
      } as any;
      const newToken = authMiddleware.generateToken(userForToken);

      // Update session with new token using Prisma
      await prisma.userSession.update({
        where: { id: req.sessionId },
        data: { token: newToken }
      });

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

      // Revoke all user sessions using Prisma
      await prisma.userSession.deleteMany({
        where: { userId: req.user.id }
      });

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

      // Find user using Prisma
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true }
      });

      // Always return success to prevent email enumeration
      if (!user) {
        res.json({ message: 'If the email exists, a reset link has been sent' });
        return;
      }

      const resetToken = uuidv4();
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      // Note: PasswordResetToken model would need to be added to Prisma schema
      // For now, we'll skip this functionality until the model is added
      // This is where we would store reset token using Prisma

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

      // Note: PasswordResetToken model would need to be added to Prisma schema
      // For now, we'll return an error until the model is added
      res.status(501).json({ error: 'Password reset functionality requires PasswordResetToken model in Prisma schema' });
      return;

      // This is how it would work with Prisma once the model is added:
      /*
      // Find valid reset token
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          token: token,
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          user: {
            select: { id: true, email: true }
          }
        }
      });

      if (!resetToken) {
        res.status(400).json({ error: 'Invalid or expired reset token' });
        return;
      }

      const { user } = resetToken;

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Update password using Prisma
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      });

      // Delete reset token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id }
      });

      // Revoke all existing sessions
      await prisma.userSession.deleteMany({
        where: { userId: user.id }
      });

      logger.info('Password reset successful', { userId: user.id, email: user.email });

      res.json({ message: 'Password reset successful' });
      */

    } catch (error) {
      logger.error('Reset password error:', error);
      next(createError('Password reset failed', 500));
    }
  }
}

export default new AuthController();
