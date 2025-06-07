import { Request, Response, NextFunction } from 'express';
const { validationResult } = require('express-validator');
import { v4 as uuidv4 } from 'uuid';
import DatabaseManager from '../../../shared/config/database';
import { CollaborationRoom, RoomParticipant, RoomSettings, User } from '../../../shared/types';
import { createError } from '../middleware/errorHandler';
import { createLogger } from '../utils/logger';
import EventPublisher from '../services/EventPublisher';

const logger = createLogger('RoomController');

class RoomController {
  /**
   * Create a new collaboration room
   */
  async createRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { name, description, settings } = req.body;
      const user = (req as any).user as User;

      if (!user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Create room settings with defaults
      const roomSettings: RoomSettings = {
        maxParticipants: settings?.maxParticipants || 8,
        isPublic: settings?.isPublic ?? true,
        requiresApproval: settings?.requiresApproval ?? false,
        allowFileUpload: settings?.allowFileUpload ?? true,
        allowRecording: settings?.allowRecording ?? false,
        genre: settings?.genre,
        targetTempo: settings?.targetTempo,
        targetKey: settings?.targetKey
      };

      const roomId = uuidv4();

      // Insert room into database
      const roomResult = await DatabaseManager.executeQuery<CollaborationRoom>(
        `INSERT INTO collaboration_rooms (id, name, description, creator_id, settings, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
         RETURNING *`,
        [roomId, name, description, user.id, JSON.stringify(roomSettings)]
      );

      const room = roomResult.rows[0];

      // Add creator as first participant
      await DatabaseManager.executeQuery(
        `INSERT INTO room_participants (id, room_id, user_id, role, joined_at, last_active)
         VALUES ($1, $2, $3, 'creator', NOW(), NOW())`,
        [uuidv4(), roomId, user.id]
      );

      logger.info('Room created successfully', {
        roomId,
        creatorId: user.id,
        name
      });

      // Publish room creation event
      await EventPublisher.publishRoomEvent(roomId, 'created', {
        room: {
          id: room.id,
          name: room.name,
          description: room.description,
          settings: roomSettings
        },
        creator: {
          id: user.id,
          username: user.username
        }
      }, user.id);

      res.status(201).json({
        message: 'Room created successfully',
        room: {
          ...room,
          settings: roomSettings,
          participantCount: 1
        }
      });

    } catch (error) {
      logger.error('Room creation failed:', error);
      next(createError('Failed to create room', 500));
    }
  }

  /**
   * Get room details
   */
  async getRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user as User;

      // Get room details
      const roomResult = await DatabaseManager.executeQuery<CollaborationRoom>(
        'SELECT * FROM collaboration_rooms WHERE id = $1',
        [id]
      );

      if (roomResult.rows.length === 0) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      const room = roomResult.rows[0];

      // Check if room is public or user has access
      if (!room.settings.isPublic && user) {
        const participantResult = await DatabaseManager.executeQuery(
          'SELECT * FROM room_participants WHERE room_id = $1 AND user_id = $2',
          [id, user.id]
        );

        if (participantResult.rows.length === 0) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      }

      // Get participants
      const participantsResult = await DatabaseManager.executeQuery(
        `SELECT rp.*, u.username, u.profile 
         FROM room_participants rp
         JOIN users u ON rp.user_id = u.id
         WHERE rp.room_id = $1
         ORDER BY rp.joined_at`,
        [id]
      );

      // Get recent messages
      const messagesResult = await DatabaseManager.executeQuery(
        `SELECT * FROM room_messages 
         WHERE room_id = $1 
         ORDER BY timestamp DESC 
         LIMIT 50`,
        [id]
      );

      res.json({
        room: {
          ...room,
          settings: typeof room.settings === 'string' ? JSON.parse(room.settings) : room.settings
        },
        participants: participantsResult.rows,
        recentMessages: messagesResult.rows.reverse(),
        participantCount: participantsResult.rows.length
      });

    } catch (error) {
      logger.error('Failed to get room:', error);
      next(createError('Failed to get room details', 500));
    }
  }

  /**
   * Get list of public rooms
   */
  async getPublicRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const genre = req.query.genre as string;
      const search = req.query.search as string;

      let query = `
        SELECT cr.*, 
               COUNT(rp.id) as participant_count,
               u.username as creator_username
        FROM collaboration_rooms cr
        LEFT JOIN room_participants rp ON cr.id = rp.room_id
        JOIN users u ON cr.creator_id = u.id
        WHERE cr.is_active = true AND (cr.settings->>'isPublic')::boolean = true
      `;

      const queryParams: any[] = [];
      let paramIndex = 1;

      if (genre) {
        query += ` AND cr.settings->>'genre' = $${paramIndex}`;
        queryParams.push(genre);
        paramIndex++;
      }

      if (search) {
        query += ` AND (cr.name ILIKE $${paramIndex} OR cr.description ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      query += `
        GROUP BY cr.id, u.username
        ORDER BY cr.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await DatabaseManager.executeQuery(query, queryParams);

      // Parse settings JSON for each room
      const rooms = result.rows.map(room => ({
        ...room,
        settings: typeof room.settings === 'string' ? JSON.parse(room.settings) : room.settings
      }));

      res.json({
        rooms,
        pagination: {
          limit,
          offset,
          total: rooms.length
        }
      });

    } catch (error) {
      logger.error('Failed to get public rooms:', error);
      next(createError('Failed to get public rooms', 500));
    }
  }

  /**
   * Join a room
   */
  async joinRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user as User;

      if (!user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Check if room exists and is active
      const roomResult = await DatabaseManager.executeQuery<CollaborationRoom>(
        'SELECT * FROM collaboration_rooms WHERE id = $1 AND is_active = true',
        [id]
      );

      if (roomResult.rows.length === 0) {
        res.status(404).json({ error: 'Room not found or inactive' });
        return;
      }

      const room = roomResult.rows[0];
      const settings = typeof room.settings === 'string' ? JSON.parse(room.settings) : room.settings;

      // Check if user is already a participant
      const existingParticipant = await DatabaseManager.executeQuery(
        'SELECT * FROM room_participants WHERE room_id = $1 AND user_id = $2',
        [id, user.id]
      );

      if (existingParticipant.rows.length > 0) {
        res.status(409).json({ error: 'Already a participant in this room' });
        return;
      }

      // Check room capacity
      const participantCount = await DatabaseManager.executeQuery(
        'SELECT COUNT(*) as count FROM room_participants WHERE room_id = $1',
        [id]
      );

      if (participantCount.rows[0].count >= settings.maxParticipants) {
        res.status(409).json({ error: 'Room is full' });
        return;
      }

      // Check if room requires approval
      if (settings.requiresApproval) {
        // TODO: Implement approval workflow
        res.status(202).json({ 
          message: 'Join request submitted for approval',
          status: 'pending_approval'
        });
        return;
      }

      // Add user as participant
      const participantId = uuidv4();
      await DatabaseManager.executeQuery(
        `INSERT INTO room_participants (id, room_id, user_id, role, joined_at, last_active)
         VALUES ($1, $2, $3, 'participant', NOW(), NOW())`,
        [participantId, id, user.id]
      );

      logger.info('User joined room', {
        roomId: id,
        userId: user.id,
        username: user.username
      });

      // Publish room event
      await EventPublisher.publishRoomEvent(id, 'user_joined', {
        userId: user.id,
        username: user.username,
        role: 'participant'
      }, user.id);

      res.json({
        message: 'Successfully joined room',
        participant: {
          id: participantId,
          roomId: id,
          userId: user.id,
          role: 'participant',
          joinedAt: new Date()
        }
      });

    } catch (error) {
      logger.error('Failed to join room:', error);
      next(createError('Failed to join room', 500));
    }
  }

  /**
   * Leave a room
   */
  async leaveRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user as User;

      if (!user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Check if user is a participant
      const participantResult = await DatabaseManager.executeQuery<RoomParticipant>(
        'SELECT * FROM room_participants WHERE room_id = $1 AND user_id = $2',
        [id, user.id]
      );

      if (participantResult.rows.length === 0) {
        res.status(404).json({ error: 'Not a participant in this room' });
        return;
      }

      const participant = participantResult.rows[0];

      // Remove participant
      await DatabaseManager.executeQuery(
        'DELETE FROM room_participants WHERE room_id = $1 AND user_id = $2',
        [id, user.id]
      );

      // If creator leaves, transfer ownership or deactivate room
      if (participant.role === 'creator') {
        const remainingParticipants = await DatabaseManager.executeQuery(
          'SELECT * FROM room_participants WHERE room_id = $1 ORDER BY joined_at LIMIT 1',
          [id]
        );

        if (remainingParticipants.rows.length > 0) {
          // Transfer ownership to next participant
          await DatabaseManager.executeQuery(
            'UPDATE room_participants SET role = $1 WHERE room_id = $2 AND user_id = $3',
            ['creator', id, remainingParticipants.rows[0].user_id]
          );

          await DatabaseManager.executeQuery(
            'UPDATE collaboration_rooms SET creator_id = $1 WHERE id = $2',
            [remainingParticipants.rows[0].user_id, id]
          );

          logger.info('Room ownership transferred', {
            roomId: id,
            oldCreator: user.id,
            newCreator: remainingParticipants.rows[0].user_id
          });
        } else {
          // No other participants, deactivate room
          await DatabaseManager.executeQuery(
            'UPDATE collaboration_rooms SET is_active = false WHERE id = $1',
            [id]
          );

          logger.info('Room deactivated - no remaining participants', { roomId: id });
        }
      }

      logger.info('User left room', {
        roomId: id,
        userId: user.id,
        username: user.username
      });

      // Publish room event
      await EventPublisher.publishRoomEvent(id, 'user_left', {
        userId: user.id,
        username: user.username,
        role: participant.role
      }, user.id);

      res.json({
        message: 'Successfully left room'
      });

    } catch (error) {
      logger.error('Failed to leave room:', error);
      next(createError('Failed to leave room', 500));
    }
  }

  /**
   * Update room settings
   */
  async updateRoomSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { settings } = req.body;
      const user = (req as any).user as User;

      if (!user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Check if user has permission to update settings
      const participantResult = await DatabaseManager.executeQuery<RoomParticipant>(
        'SELECT role FROM room_participants WHERE room_id = $1 AND user_id = $2',
        [id, user.id]
      );

      if (participantResult.rows.length === 0 || 
          !['creator', 'moderator'].includes(participantResult.rows[0].role)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      // Update room settings
      await DatabaseManager.executeQuery(
        'UPDATE collaboration_rooms SET settings = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(settings), id]
      );

      logger.info('Room settings updated', {
        roomId: id,
        updatedBy: user.id
      });

      // Publish room event
      await EventPublisher.publishRoomEvent(id, 'settings_updated', {
        settings,
        updatedBy: user.id
      }, user.id);

      res.json({
        message: 'Room settings updated successfully',
        settings
      });

    } catch (error) {
      logger.error('Failed to update room settings:', error);
      next(createError('Failed to update room settings', 500));
    }
  }

  /**
   * Get user's rooms
   */
  async getUserRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user as User;

      if (!user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const result = await DatabaseManager.executeQuery(
        `SELECT cr.*, rp.role, rp.joined_at,
                COUNT(all_participants.id) as participant_count
         FROM collaboration_rooms cr
         JOIN room_participants rp ON cr.id = rp.room_id
         LEFT JOIN room_participants all_participants ON cr.id = all_participants.room_id
         WHERE rp.user_id = $1 AND cr.is_active = true
         GROUP BY cr.id, rp.role, rp.joined_at
         ORDER BY rp.last_active DESC`,
        [user.id]
      );

      const rooms = result.rows.map(room => ({
        ...room,
        settings: typeof room.settings === 'string' ? JSON.parse(room.settings) : room.settings
      }));

      res.json({ rooms });

    } catch (error) {
      logger.error('Failed to get user rooms:', error);
      next(createError('Failed to get user rooms', 500));
    }
  }

  /**
   * Get room statistics
   */
  async getRoomStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user as User;

      // Check if user has access to room stats
      const participantResult = await DatabaseManager.executeQuery(
        'SELECT role FROM room_participants WHERE room_id = $1 AND user_id = $2',
        [id, user?.id]
      );

      if (participantResult.rows.length === 0) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Get various room statistics
      const stats = await Promise.all([
        // Total participants
        DatabaseManager.executeQuery(
          'SELECT COUNT(*) as total FROM room_participants WHERE room_id = $1',
          [id]
        ),
        
        // Active participants (last 24 hours)
        DatabaseManager.executeQuery(
          'SELECT COUNT(*) as active FROM room_participants WHERE room_id = $1 AND last_active > NOW() - INTERVAL \'24 hours\'',
          [id]
        ),
        
        // Total messages
        DatabaseManager.executeQuery(
          'SELECT COUNT(*) as total FROM room_messages WHERE room_id = $1',
          [id]
        ),
        
        // Audio files uploaded
        DatabaseManager.executeQuery(
          'SELECT COUNT(*) as total FROM audio_files WHERE room_id = $1',
          [id]
        ),
        
        // Session duration (room age)
        DatabaseManager.executeQuery(
          'SELECT created_at FROM collaboration_rooms WHERE id = $1',
          [id]
        )
      ]);

      const roomAge = new Date().getTime() - new Date(stats[4].rows[0].created_at).getTime();

      res.json({
        stats: {
          totalParticipants: parseInt(stats[0].rows[0].total),
          activeParticipants: parseInt(stats[1].rows[0].active),
          totalMessages: parseInt(stats[2].rows[0].total),
          audioFilesUploaded: parseInt(stats[3].rows[0].total),
          sessionDuration: Math.floor(roomAge / 1000), // seconds
          createdAt: stats[4].rows[0].created_at
        }
      });

    } catch (error) {
      logger.error('Failed to get room stats:', error);
      next(createError('Failed to get room statistics', 500));
    }
  }

  /**
   * Get detailed information about a specific room
   */
  async getRoomDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId } = req.params;

      if (!roomId) {
        res.status(400).json({ error: 'Room ID is required' });
        return;
      }

      const roomResult = await DatabaseManager.executeQuery(
        `SELECT cr.*, 
                COUNT(rp.id) as participant_count,
                MAX(rp.last_active) as last_activity
         FROM collaboration_rooms cr
         LEFT JOIN room_participants rp ON cr.id = rp.room_id
         WHERE cr.id = $1 AND cr.is_active = true
         GROUP BY cr.id`,
        [roomId]
      );

      if (roomResult.rows.length === 0) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      const room = roomResult.rows[0];

      // Get recent participants
      const participantsResult = await DatabaseManager.executeQuery(
        `SELECT u.id, u.username, u.email, rp.role, rp.joined_at, rp.last_active
         FROM room_participants rp
         JOIN users u ON rp.user_id = u.id
         WHERE rp.room_id = $1
         ORDER BY rp.last_active DESC
         LIMIT 10`,
        [roomId]
      );

      res.json({
        ...room,
        recent_participants: participantsResult.rows
      });

      logger.info('Room details retrieved', { roomId, userId: (req as any).user?.id });

    } catch (error) {
      logger.error('Failed to get room details:', error);
      next(createError('Failed to get room details', 500));
    }
  }

  /**
   * Get statistics for a user's room activity
   */
  async getUserRoomStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const requestingUser = (req as any).user as User;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      // Users can only view their own stats or public stats
      if (requestingUser.id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const statsResult = await DatabaseManager.executeQuery(
        `SELECT 
           COUNT(DISTINCT rp.room_id) as total_rooms_joined,
           COUNT(DISTINCT CASE WHEN cr.created_by = $1 THEN cr.id END) as rooms_created,
           AVG(EXTRACT(EPOCH FROM (rp.last_active - rp.joined_at))) as avg_session_duration,
           MAX(rp.last_active) as last_activity,
           COUNT(DISTINCT CASE WHEN rp.last_active > NOW() - INTERVAL '7 days' THEN rp.room_id END) as active_rooms_week
         FROM room_participants rp
         JOIN collaboration_rooms cr ON rp.room_id = cr.id
         WHERE rp.user_id = $1`,
        [userId]
      );

      const stats = statsResult.rows[0];

      res.json({
        user_id: userId,
        statistics: {
          total_rooms_joined: parseInt(stats.total_rooms_joined) || 0,
          rooms_created: parseInt(stats.rooms_created) || 0,
          average_session_duration_seconds: stats.avg_session_duration || 0,
          last_activity: stats.last_activity,
          active_rooms_this_week: parseInt(stats.active_rooms_week) || 0
        }
      });

      logger.info('User room stats retrieved', { userId, requestingUserId: requestingUser.id });

    } catch (error) {
      logger.error('Failed to get user room stats:', error);
      next(createError('Failed to get user room statistics', 500));
    }
  }

  /**
   * Delete a room (only room creator can delete)
   */
  async deleteRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId } = req.params;
      const user = (req as any).user as User;

      if (!roomId) {
        res.status(400).json({ error: 'Room ID is required' });
        return;
      }

      if (!user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Check if room exists and user is the creator
      const roomResult = await DatabaseManager.executeQuery(
        'SELECT * FROM collaboration_rooms WHERE id = $1 AND created_by = $2',
        [roomId, user.id]
      );

      if (roomResult.rows.length === 0) {
        res.status(404).json({ error: 'Room not found or you do not have permission to delete it' });
        return;
      }

      // Soft delete the room
      await DatabaseManager.executeQuery(
        `UPDATE collaboration_rooms 
         SET is_active = false, updated_at = NOW() 
         WHERE id = $1`,
        [roomId]
      );

      // Remove all participants
      await DatabaseManager.executeQuery(
        'DELETE FROM room_participants WHERE room_id = $1',
        [roomId]
      );

      res.json({ 
        message: 'Room deleted successfully',
        room_id: roomId
      });

      logger.info('Room deleted', { roomId, userId: user.id });

    } catch (error) {
      logger.error('Failed to delete room:', error);
      next(createError('Failed to delete room', 500));
    }
  }
}

export default new RoomController();
