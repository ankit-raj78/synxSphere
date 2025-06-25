import { Request, Response, NextFunction } from 'express';
const { validationResult } = require('express-validator');
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../../lib/prisma';
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

      // Insert room into database using Prisma
      const room = await (prisma.room as any).create({
        data: {
          id: roomId,
          name,
          description,
          creatorId: user.id,
          settings: roomSettings as any, // Cast to any to handle JSON type
          isActive: true,
        }
      });

      // Add creator as first participant using Prisma
      await prisma.roomParticipant.create({
        data: {
          id: uuidv4(),
          roomId,
          userId: user.id,
          role: 'creator'
        }
      });

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
      const room = await prisma.room.findUnique({
        where: { id },
        include: {
          creator: {
            select: { id: true, username: true }
          }
        }
      });

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      // Check if room is public or user has access
      const settings = room.settings as any;
      if (!settings?.isPublic && user) {
        const participant = await prisma.roomParticipant.findFirst({
          where: {
            roomId: id,
            userId: user.id
          }
        });

        if (!participant) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      }

      // Get participants with user details
      const participants = await prisma.roomParticipant.findMany({
        where: { roomId: id },
        include: {
          user: {
            select: { id: true, username: true, profile: true }
          }
        },
        orderBy: { joinedAt: 'asc' }
      });

      res.json({
        room: {
          ...room,
          settings: room.settings
        },
        participants: participants.map(p => ({
          ...p,
          username: p.user.username,
          profile: p.user.profile
        })),
        recentMessages: [], // Messages functionality not implemented yet
        participantCount: participants.length
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

      // Build where clause for filtering
      const where: any = {
        isActive: true,
        settings: {
          path: ['isPublic'],
          equals: true
        }
      };

      if (genre) {
        where.settings = {
          ...where.settings,
          path: ['genre'],
          equals: genre
        };
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const rooms = await (prisma.room as any).findMany({
        where,
        include: {
          creator: {
            select: { username: true }
          },
          participants: {
            select: { id: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      });

      const roomsWithCounts = rooms.map((room: any) => ({
        ...room,
        participantCount: room.participants.length,
        creatorUsername: room.creator.username,
        participants: undefined, // Remove the full participants array
        creator: undefined // Remove the full creator object
      }));

      res.json({
        rooms: roomsWithCounts,
        pagination: {
          limit,
          offset,
          total: roomsWithCounts.length
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
      const room = await (prisma.room as any).findFirst({
        where: { 
          id,
          isActive: true 
        }
      });

      if (!room) {
        res.status(404).json({ error: 'Room not found or inactive' });
        return;
      }

      const settings = room.settings as any;

      // Check if user is already a participant
      const existingParticipant = await prisma.roomParticipant.findFirst({
        where: {
          roomId: id,
          userId: user.id
        }
      });

      if (existingParticipant) {
        res.status(409).json({ error: 'Already a participant in this room' });
        return;
      }

      // Check room capacity
      const participantCount = await prisma.roomParticipant.count({
        where: { roomId: id }
      });

      if (settings?.maxParticipants && participantCount >= settings.maxParticipants) {
        res.status(409).json({ error: 'Room is full' });
        return;
      }

      // Check if room requires approval
      if (settings?.requiresApproval) {
        // TODO: Implement approval workflow
        res.status(202).json({ 
          message: 'Join request submitted for approval',
          status: 'pending_approval'
        });
        return;
      }

      // Add user as participant
      const participant = await prisma.roomParticipant.create({
        data: {
          roomId: id,
          userId: user.id,
          role: 'participant'
        }
      });

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
          id: participant.id,
          roomId: id,
          userId: user.id,
          role: 'participant',
          joinedAt: participant.joinedAt
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
      const participant = await prisma.roomParticipant.findFirst({
        where: {
          roomId: id,
          userId: user.id
        }
      });

      if (!participant) {
        res.status(404).json({ error: 'Not a participant in this room' });
        return;
      }

      // Remove participant
      await prisma.roomParticipant.delete({
        where: {
          id: participant.id
        }
      });

      // If creator leaves, transfer ownership or deactivate room
      if (participant.role === 'creator') {
        const remainingParticipants = await prisma.roomParticipant.findMany({
          where: { roomId: id },
          orderBy: { joinedAt: 'asc' },
          take: 1
        });

        if (remainingParticipants.length > 0) {
          // Transfer ownership to next participant
          await prisma.roomParticipant.update({
            where: { id: remainingParticipants[0].id },
            data: { role: 'creator' }
          });

          await prisma.room.update({
            where: { id },
            data: { creatorId: remainingParticipants[0].userId }
          });

          logger.info('Room ownership transferred', {
            roomId: id,
            oldCreator: user.id,
            newCreator: remainingParticipants[0].userId
          });
        } else {
          // No other participants, deactivate room
          await (prisma.room as any).update({
            where: { id },
            data: { isActive: false }
          });

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
      const participant = await prisma.roomParticipant.findFirst({
        where: {
          roomId: id,
          userId: user.id
        },
        select: { role: true }
      });

      if (!participant || !['creator', 'moderator'].includes(participant.role)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      // Update room settings
      await prisma.room.update({
        where: { id },
        data: { 
          settings: settings,
          updatedAt: new Date()
        }
      });

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

      // Get rooms where user is a participant
      const userParticipations = await (prisma.roomParticipant as any).findMany({
        where: { userId: user.id },
        include: {
          room: {
            include: {
              _count: {
                select: { participants: true }
              }
            }
          }
        },
        orderBy: { lastActive: 'desc' }
      });

      const rooms = userParticipations
        .filter((p: any) => p.room && p.room.isActive) // Filter out rooms that don't exist or aren't active
        .map((participation: any) => ({
          ...participation.room,
          role: participation.role,
          joinedAt: participation.joinedAt,
          participantCount: participation.room._count.participants,
          _count: undefined
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
      const participant = await prisma.roomParticipant.findFirst({
        where: {
          roomId: id,
          userId: user?.id
        },
        select: { role: true }
      });

      if (!participant) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Get various room statistics using Prisma aggregations
      const [
        totalParticipants,
        activeParticipants,
        totalAudioFiles,
        room
      ] = await Promise.all([
        // Total participants
        prisma.roomParticipant.count({
          where: { roomId: id }
        }),
        
        // Active participants (last 24 hours) - simplified for now
        (prisma.roomParticipant as any).count({
          where: { 
            roomId: id,
            lastActive: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }),
        
        // Audio files uploaded to room
        prisma.audioFile.count({
          where: { roomId: id }
        }),
        
        // Room creation date
        prisma.room.findUnique({
          where: { id },
          select: { createdAt: true }
        })
      ]);

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      const roomAge = new Date().getTime() - new Date(room.createdAt).getTime();

      res.json({
        stats: {
          totalParticipants,
          activeParticipants,
          totalMessages: 0, // Messages not implemented yet
          audioFilesUploaded: totalAudioFiles,
          sessionDuration: Math.floor(roomAge / 1000), // seconds
          createdAt: room.createdAt
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

      const room = await (prisma.room as any).findFirst({
        where: { 
          id: roomId,
          isActive: true 
        },
        include: {
          _count: {
            select: { participants: true }
          }
        }
      });

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      // Get recent participants with user details
      const recentParticipants = await (prisma.roomParticipant as any).findMany({
        where: { roomId },
        include: {
          user: {
            select: { id: true, username: true, email: true }
          }
        },
        orderBy: { lastActive: 'desc' },
        take: 10
      });

      // Find the most recent activity
      const lastActivity = recentParticipants.length > 0 
        ? (recentParticipants[0] as any).lastActive 
        : null;

      res.json({
        ...room,
        participantCount: room._count.participants,
        lastActivity,
        recentParticipants: recentParticipants.map((p: any) => ({
          id: p.user.id,
          username: p.user.username,
          email: p.user.email,
          role: p.role,
          joinedAt: p.joinedAt,
          lastActive: p.lastActive
        })),
        _count: undefined
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

      // Get user's room participation statistics
      const [
        totalRoomsJoined,
        roomsCreated,
        lastActivity,
        activeRoomsThisWeek
      ] = await Promise.all([
        // Total rooms joined
        prisma.roomParticipant.count({
          where: { userId }
        }),

        // Rooms created
        prisma.room.count({
          where: { creatorId: userId }
        }),

        // Last activity
        (prisma.roomParticipant as any).findFirst({
          where: { userId },
          orderBy: { lastActive: 'desc' },
          select: { lastActive: true }
        }),

        // Active rooms this week
        (prisma.roomParticipant as any).count({
          where: {
            userId,
            lastActive: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      res.json({
        user_id: userId,
        statistics: {
          total_rooms_joined: totalRoomsJoined,
          rooms_created: roomsCreated,
          average_session_duration_seconds: 0, // Would need complex calculation
          last_activity: (lastActivity as any)?.lastActive || null,
          active_rooms_this_week: activeRoomsThisWeek
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
      const room = await prisma.room.findFirst({
        where: { 
          id: roomId,
          creatorId: user.id 
        }
      });

      if (!room) {
        res.status(404).json({ error: 'Room not found or you do not have permission to delete it' });
        return;
      }

      // Use a transaction to ensure data consistency
      await prisma.$transaction(async (tx) => {
        // Soft delete the room
        await (tx.room as any).update({
          where: { id: roomId },
          data: { 
            isActive: false,
            updatedAt: new Date()
          }
        });

        // Remove all participants
        await tx.roomParticipant.deleteMany({
          where: { roomId }
        });
      });

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
