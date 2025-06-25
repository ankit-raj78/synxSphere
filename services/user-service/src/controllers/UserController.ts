import { Request, Response, NextFunction } from 'express';
const { validationResult } = require('express-validator');
import { prisma } from '../../../../lib/prisma';
import { User, UserSession } from '../../../shared/types';
import { createError } from '../middleware/errorHandler';
import { createLogger } from '../utils/logger';

const logger = createLogger('UserController');

class UserController {
  /**
   * Get users with pagination and search
   */
  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const role = req.query.role as string;
      const offset = (page - 1) * limit;

      // Build Prisma where clause
      const whereClause: any = {};

      if (search) {
        whereClause.OR = [
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (role) {
        whereClause.profile = {
          path: ['role'],
          equals: role
        };
      }

      // Get users with Prisma
      const [users, totalUsers] = await Promise.all([
        prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            email: true,
            username: true,
            profile: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.user.count({ where: whereClause })
      ]);

      res.json({
        users: users,
        pagination: {
          page,
          limit,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limit)
        }
      });

    } catch (error) {
      logger.error('Get users error:', error);
      next(createError('Failed to fetch users', 500));
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;

      // Check if user can access this profile
      if (req.user?.id !== id && req.user?.profile?.role !== 'admin') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const result = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          username: true,
          profile: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!result) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ user: result });

    } catch (error) {
      logger.error('Get user by ID error:', error);
      next(createError('Failed to fetch user', 500));
    }
  }

  /**
   * Update user
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { email, username, profile } = req.body;

      // Check if user can update this profile
      if (req.user?.id !== id && req.user?.profile?.role !== 'admin') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Check if user exists using Prisma
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          username: true,
          profile: true
        }
      });

      if (!existingUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const currentUser = existingUser;

      // Check for email/username conflicts using Prisma
      if (email || username) {
        const conflictCheck = await prisma.user.findFirst({
          where: {
            OR: [
              { email: email || currentUser.email },
              { username: username || currentUser.username }
            ],
            NOT: { id: id }
          },
          select: { id: true }
        });

        if (conflictCheck) {
          res.status(409).json({ error: 'Email or username already exists' });
          return;
        }
      }

      // Merge profile data
      const currentProfileObj = (currentUser.profile as any) || {};
      const updatedProfile = profile ? { ...currentProfileObj, ...profile } : currentProfileObj;

      // Update user using Prisma
      const result = await prisma.user.update({
        where: { id },
        data: {
          email: email || currentUser.email,
          username: username || currentUser.username,
          profile: updatedProfile as any
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

      logger.info('User updated', { userId: id, updatedBy: req.user?.id });

      res.json({
        message: 'User updated successfully',
        user: result
      });

    } catch (error) {
      logger.error('Update user error:', error);
      next(createError('Failed to update user', 500));
    }
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;

      // Check if user exists using Prisma
      const userResult = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true
        }
      });

      if (!userResult) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Delete user using Prisma (this should cascade to sessions and other related data)
      await prisma.user.delete({
        where: { id }
      });

      logger.info('User deleted', { 
        deletedUserId: id, 
        deletedBy: req.user?.id,
        deletedEmail: userResult.email
      });

      res.json({ message: 'User deleted successfully' });

    } catch (error) {
      logger.error('Delete user error:', error);
      next(createError('Failed to delete user', 500));
    }
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;

      // Check if user can access this data
      if (req.user?.id !== id && req.user?.profile?.role !== 'admin') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const sessions = await prisma.userSession.findMany({
        where: {
          userId: id,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          userId: true,
          expiresAt: true,
          createdAt: true
        }
      });

      res.json({ sessions });

    } catch (error) {
      logger.error('Get user sessions error:', error);
      next(createError('Failed to fetch user sessions', 500));
    }
  }

  /**
   * Search users by musical preferences
   */
  async searchUsersByPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { genres, instruments, experience, collaborationStyle } = req.body;

      // Use Prisma with JSON filtering capabilities
      const whereConditions: any = {};

      // Build filter conditions for musical preferences
      if (genres && genres.length > 0) {
        whereConditions.profile = {
          ...whereConditions.profile,
          path: ['musicalPreferences', 'genres'],
          array_contains: genres
        };
      }

      if (instruments && instruments.length > 0) {
        whereConditions.profile = {
          ...whereConditions.profile,
          path: ['musicalPreferences', 'instruments'],
          array_contains: instruments
        };
      }

      if (experience) {
        whereConditions.profile = {
          ...whereConditions.profile,
          path: ['musicalPreferences', 'experience'],
          equals: experience
        };
      }

      if (collaborationStyle) {
        whereConditions.profile = {
          ...whereConditions.profile,
          path: ['musicalPreferences', 'collaborationStyle'],
          equals: collaborationStyle
        };
      }

      // If no filters provided, get all users with musical preferences
      if (!genres && !instruments && !experience && !collaborationStyle) {
        whereConditions.profile = {
          path: ['musicalPreferences'],
          not: undefined
        };
      }

      const users = await prisma.user.findMany({
        where: whereConditions,
        select: {
          id: true,
          username: true,
          profile: true
        },
        take: 50
      });

      // Transform the response to match expected format
      const transformedUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        bio: (user.profile as any)?.bio || '',
        musical_preferences: (user.profile as any)?.musicalPreferences || {}
      }));

      res.json({ users: transformedUsers });

    } catch (error) {
      logger.error('Search users by preferences error:', error);
      // Fallback to simple search if complex JSON filtering fails
      try {
        const fallbackUsers = await prisma.user.findMany({
          where: {
            profile: {
              not: undefined
            }
          },
          select: {
            id: true,
            username: true,
            profile: true
          },
          take: 50
        });

        const transformedUsers = fallbackUsers
          .filter(user => (user.profile as any)?.musicalPreferences)
          .map(user => ({
            id: user.id,
            username: user.username,
            bio: (user.profile as any)?.bio || '',
            musical_preferences: (user.profile as any)?.musicalPreferences || {}
          }));

        res.json({ users: transformedUsers });
      } catch (fallbackError) {
        logger.error('Fallback search also failed:', fallbackError);
        next(createError('Failed to search users', 500));
      }
    }
  }
}

export default new UserController();
