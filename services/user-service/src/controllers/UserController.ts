import { Request, Response, NextFunction } from 'express';
const { validationResult } = require('express-validator');
import DatabaseManager from '../../../shared/config/database';
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

      let query = `
        SELECT id, email, username, profile, created_at, updated_at
        FROM users
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      // Add search conditions
      if (search) {
        query += ` AND (username ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (role) {
        query += ` AND profile->>'role' = $${paramIndex}`;
        params.push(role);
        paramIndex++;
      }

      // Add pagination
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await DatabaseManager.executeQuery<User>(query, params);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
      const countParams: any[] = [];
      let countParamIndex = 1;

      if (search) {
        countQuery += ` AND (username ILIKE $${countParamIndex} OR email ILIKE $${countParamIndex})`;
        countParams.push(`%${search}%`);
        countParamIndex++;
      }

      if (role) {
        countQuery += ` AND profile->>'role' = $${countParamIndex}`;
        countParams.push(role);
      }

      const countResult = await DatabaseManager.executeQuery(countQuery, countParams);
      const totalUsers = parseInt(countResult.rows[0].count);

      res.json({
        users: result.rows,
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

      const result = await DatabaseManager.executeQuery<User>(
        'SELECT id, email, username, profile, created_at, updated_at FROM users WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ user: result.rows[0] });

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

      // Check if user exists
      const existingUser = await DatabaseManager.executeQuery<User>(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );

      if (existingUser.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const currentUser = existingUser.rows[0];

      // Check for email/username conflicts
      if (email || username) {
        const conflictCheck = await DatabaseManager.executeQuery(
          'SELECT id FROM users WHERE (email = $1 OR username = $2) AND id != $3',
          [email || currentUser.email, username || currentUser.username, id]
        );

        if (conflictCheck.rows.length > 0) {
          res.status(409).json({ error: 'Email or username already exists' });
          return;
        }
      }

      // Merge profile data
      const updatedProfile = profile ? { ...currentUser.profile, ...profile } : currentUser.profile;

      // Update user
      const result = await DatabaseManager.executeQuery<User>(
        `UPDATE users 
         SET email = $1, username = $2, profile = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING id, email, username, profile, created_at, updated_at`,
        [
          email || currentUser.email,
          username || currentUser.username,
          JSON.stringify(updatedProfile),
          id
        ]
      );

      logger.info('User updated', { userId: id, updatedBy: req.user?.id });

      res.json({
        message: 'User updated successfully',
        user: result.rows[0]
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

      // Check if user exists
      const userResult = await DatabaseManager.executeQuery(
        'SELECT id, email FROM users WHERE id = $1',
        [id]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Delete user (this should cascade to sessions and other related data)
      await DatabaseManager.executeQuery(
        'DELETE FROM users WHERE id = $1',
        [id]
      );

      logger.info('User deleted', { 
        deletedUserId: id, 
        deletedBy: req.user?.id,
        deletedEmail: userResult.rows[0].email
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

      const result = await DatabaseManager.executeQuery<UserSession>(
        `SELECT id, user_id, expires_at, metadata, created_at
         FROM user_sessions 
         WHERE user_id = $1 AND expires_at > NOW()
         ORDER BY created_at DESC`,
        [id]
      );

      res.json({ sessions: result.rows });

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

      let query = `
        SELECT id, username, profile->>'bio' as bio, profile->'musicalPreferences' as musical_preferences
        FROM users
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      // Search by genres
      if (genres && genres.length > 0) {
        query += ` AND profile->'musicalPreferences'->'genres' ?| array[${genres.map(() => `$${paramIndex++}`).join(',')}]`;
        params.push(...genres);
      }

      // Search by instruments
      if (instruments && instruments.length > 0) {
        query += ` AND profile->'musicalPreferences'->'instruments' ?| array[${instruments.map(() => `$${paramIndex++}`).join(',')}]`;
        params.push(...instruments);
      }

      // Search by experience level
      if (experience) {
        query += ` AND profile->'musicalPreferences'->>'experience' = $${paramIndex}`;
        params.push(experience);
        paramIndex++;
      }

      // Search by collaboration style
      if (collaborationStyle) {
        query += ` AND profile->'musicalPreferences'->>'collaborationStyle' = $${paramIndex}`;
        params.push(collaborationStyle);
      }

      query += ' LIMIT 50'; // Limit results

      const result = await DatabaseManager.executeQuery(query, params);

      res.json({ users: result.rows });

    } catch (error) {
      logger.error('Search users by preferences error:', error);
      next(createError('Failed to search users', 500));
    }
  }
}

export default new UserController();
