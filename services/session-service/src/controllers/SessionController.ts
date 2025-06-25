import { Request, Response } from 'express';
import { EventPublisher } from '../services/EventPublisher';
import { logger } from '../utils/logger';
import { 
  Session, 
  SessionState, 
  SessionParticipant,
  SessionEvent,
  CreateSessionRequest,
  UpdateSessionRequest 
} from '../../../shared/types';
import { prisma } from '../../../../lib/prisma';

// Define SessionSettings interface
interface SessionSettings {
  maxParticipants: number;
  allowGuestControl: boolean;
  requireApproval: boolean;
  autoPlay: boolean;
  crossfade: boolean;
  volume: number;
}

// Default settings
const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  maxParticipants: 50,
  allowGuestControl: false,
  requireApproval: false,
  autoPlay: true,
  crossfade: false,
  volume: 0.8
};

// Type guard to ensure settings is properly typed
function isValidSessionSettings(settings: any): settings is SessionSettings {
  return settings && 
    typeof settings === 'object' &&
    typeof settings.maxParticipants === 'number' &&
    typeof settings.allowGuestControl === 'boolean' &&
    typeof settings.requireApproval === 'boolean' &&
    typeof settings.autoPlay === 'boolean' &&
    typeof settings.crossfade === 'boolean' &&
    typeof settings.volume === 'number';
}

// Helper function to safely get settings
function getSessionSettings(rawSettings: any): SessionSettings {
  if (isValidSessionSettings(rawSettings)) {
    return rawSettings;
  }
  return DEFAULT_SESSION_SETTINGS;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    profile: {
      role?: 'user' | 'admin' | 'moderator';
      musicalPreferences?: {
        genres: string[];
        instruments: string[];
        experience: 'beginner' | 'intermediate' | 'advanced' | 'professional';
        collaborationStyle: 'leader' | 'follower' | 'flexible';
        preferredTempo: {
          min: number;
          max: number;
        };
        preferredKeys: string[];
      };
      bio?: string;
      avatar?: string;
    };
    created_at: Date;
  };
}

class SessionController {
  private readonly eventPublisher;

  constructor() {
    this.eventPublisher = new EventPublisher();
  }

  async createSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const sessionData: CreateSessionRequest = req.body;
      const userId = req.user.id;

      // Validate required fields
      if (!sessionData.roomId || !sessionData.name) {
        res.status(400).json({ error: 'Room ID and session name are required' });
        return;
      }

      // Check if room exists and user has access using Prisma
      const room = await prisma.room.findFirst({
        where: {
          id: sessionData.roomId,
          OR: [
            { 
              participants: {
                some: {
                  userId: userId
                }
              }
            },
            { creatorId: userId }
          ]
        }
      });

      if (!room) {
        res.status(404).json({ error: 'Room not found or access denied' });
        return;
      }

      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create session using Prisma
      const session = await prisma.session.create({
        data: {
          id: sessionId,
          name: sessionData.name,
          roomId: sessionData.roomId,
          creatorId: userId,
          settings: {
            maxParticipants: sessionData.maxParticipants || 50,
            allowGuestControl: sessionData.allowGuestControl || false,
            requireApproval: sessionData.requireApproval || false,
            autoPlay: sessionData.autoPlay || true,
            crossfade: false,
            volume: 0.8
          },
          state: {
            currentTrack: null,
            position: 0,
            isPlaying: false,
            volume: 0.8,
            queue: [],
            playbackMode: 'normal'
          },
          isActive: true,
          lastActivity: new Date()
        }
      });

      // Publish session created event
      await this.eventPublisher.publishSessionEvent(
        session.id,
        'created',
        { sessionName: session.name },
        userId,
        session.roomId
      );

      logger.info(`Session created: ${sessionId} by user ${userId}`);
      res.status(201).json({ session });

    } catch (error) {
      logger.error('Error creating session:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  }

  async getSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      // Get session with related data using Prisma
      const sessionData = await prisma.session.findFirst({
        where: { id: sessionId },
        include: {
          room: {
            select: {
              name: true
            }
          },
          creator: {
            select: {
              username: true
            }
          },
          participants: {
            where: {
              isActive: true
            },
            include: {
              user: {
                select: {
                  username: true,
                  profile: true
                }
              }
            }
          }
        }
      });

      if (!sessionData) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const session: Session = {
        id: sessionData.id,
        name: sessionData.name,
        roomId: sessionData.roomId,
        createdBy: sessionData.creatorId,
        creatorId: sessionData.creatorId,
        status: SessionState.ACTIVE,
        participants: sessionData.participants.map((p: any) => ({
          userId: p.userId,
          username: p.user.username,
          role: p.role,
          joinedAt: p.joinedAt,
          isActive: p.isActive,
          permissions: p.permissions
        })),
        state: sessionData.state,
        settings: getSessionSettings(sessionData.settings),
        currentTrack: undefined,
        playbackPosition: 0,
        isPlaying: false,
        isActive: sessionData.isActive,
        lastActivity: sessionData.lastActivity,
        createdAt: sessionData.createdAt,
        updatedAt: sessionData.updatedAt
      };

      res.json({ session });

    } catch (error) {
      logger.error('Error getting session:', error);
      res.status(500).json({ error: 'Failed to get session' });
    }
  }

  async updateSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { sessionId } = req.params;
      const updateData: UpdateSessionRequest = req.body;
      const userId = req.user.id;

      // Check if user has permission to update session using Prisma
      const session = await prisma.session.findFirst({
        where: { id: sessionId }
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Check if user is creator or has admin permissions
      if (session.creatorId !== userId) {
        const participant = await prisma.sessionParticipant.findFirst({
          where: {
            sessionId: sessionId,
            userId: userId,
            role: 'admin'
          }
        });

        if (!participant) {
          res.status(403).json({ error: 'Permission denied' });
          return;
        }
      }

      // Update session using Prisma
      const updateFields: any = {
        lastActivity: new Date()
      };

      if (updateData.name) {
        updateFields.name = updateData.name;
      }

      if (updateData.settings) {
        updateFields.settings = updateData.settings;
      }

      if (updateData.isActive !== undefined) {
        updateFields.isActive = updateData.isActive;
      }

      await prisma.session.update({
        where: { id: sessionId },
        data: updateFields
      });

      // Publish session updated event
      await this.eventPublisher.publishSessionEvent(
        sessionId,
        'updated',
        updateData,
        userId,
        session.roomId
      );

      logger.info(`Session updated: ${sessionId} by user ${userId}`);
      res.json({ message: 'Session updated successfully' });

    } catch (error) {
      logger.error('Error updating session:', error);
      res.status(500).json({ error: 'Failed to update session' });
    }
  }

  async deleteSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { sessionId } = req.params;
      const userId = req.user.id;

      // Check if user is session creator using Prisma
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          creatorId: userId
        }
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found or permission denied' });
        return;
      }

      // Use Prisma transaction for soft delete
      await prisma.$transaction(async (tx: any) => {
        // Soft delete session (mark as inactive)
        await tx.session.update({
          where: { id: sessionId },
          data: {
            isActive: false,
            lastActivity: new Date()
          }
        });

        // Remove all participants
        await tx.sessionParticipant.updateMany({
          where: { sessionId: sessionId },
          data: { isActive: false }
        });
      });

      // Publish session deleted event
      await this.eventPublisher.publishSessionEvent(
        sessionId,
        'deleted',
        {},
        userId,
        session.roomId
      );

      logger.info(`Session deleted: ${sessionId} by user ${userId}`);
      res.json({ message: 'Session deleted successfully' });

    } catch (error) {
      logger.error('Error deleting session:', error);
      res.status(500).json({ error: 'Failed to delete session' });
    }
  }

  async joinSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { sessionId } = req.params;
      const userId = req.user.id;

      // Check if session exists and is active using Prisma
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          isActive: true
        }
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found or inactive' });
        return;
      }

      const settings = getSessionSettings(session.settings);

      // Check if user is already a participant using Prisma
      const existingParticipant = await prisma.sessionParticipant.findFirst({
        where: {
          sessionId: sessionId,
          userId: userId
        }
      });

      if (existingParticipant) {
        // Reactivate if inactive
        await prisma.sessionParticipant.update({
          where: {
            id: existingParticipant.id
          },
          data: {
            isActive: true,
            joinedAt: new Date()
          }
        });
      } else {
        // Check participant limit using Prisma
        const participantCount = await prisma.sessionParticipant.count({
          where: {
            sessionId: sessionId,
            isActive: true
          }
        });

        if (participantCount >= settings.maxParticipants) {
          res.status(400).json({ error: 'Session is full' });
          return;
        }

        // Add new participant using Prisma
        await prisma.sessionParticipant.create({
          data: {
            sessionId: sessionId,
            userId: userId,
            role: 'participant',
            isActive: true,
            permissions: {}
          }
        });
      }

      // Update session last activity using Prisma
      await prisma.session.update({
        where: { id: sessionId },
        data: { lastActivity: new Date() }
      });

      // Publish participant joined event
      await this.eventPublisher.publishSessionEvent(
        sessionId,
        'participant.joined',
        { username: req.user.username },
        userId,
        session.roomId
      );

      logger.info(`User ${userId} joined session ${sessionId}`);
      res.json({ message: 'Successfully joined session' });

    } catch (error) {
      logger.error('Error joining session:', error);
      res.status(500).json({ error: 'Failed to join session' });
    }
  }

  async leaveSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { sessionId } = req.params;
      const userId = req.user.id;

      // Remove participant using Prisma
      await prisma.sessionParticipant.updateMany({
        where: {
          sessionId: sessionId,
          userId: userId
        },
        data: { isActive: false }
      });

      // Get session info for event using Prisma
      const session = await prisma.session.findFirst({
        where: { id: sessionId },
        select: { roomId: true }
      });

      if (session) {
        // Publish participant left event
        await this.eventPublisher.publishSessionEvent(
          sessionId,
          'participant.left',
          { username: req.user.username },
          userId,
          session.roomId
        );
      }

      logger.info(`User ${userId} left session ${sessionId}`);
      res.json({ message: 'Successfully left session' });

    } catch (error) {
      logger.error('Error leaving session:', error);
      res.status(500).json({ error: 'Failed to leave session' });
    }
  }

  async getSessionParticipants(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      // Get participants using Prisma with relations
      const participants = await prisma.sessionParticipant.findMany({
        where: {
          sessionId: sessionId,
          isActive: true
        },
        include: {
          user: {
            select: {
              username: true,
              email: true,
              profile: true
            }
          }
        },
        orderBy: {
          joinedAt: 'asc'
        }
      });

      const participantList = participants.map((p: any) => ({
        userId: p.userId,
        username: p.user.username,
        email: p.user.email,
        profilePictureUrl: p.user.profile?.avatar,
        role: p.role,
        joinedAt: p.joinedAt,
        permissions: p.permissions
      }));

      res.json({ participants: participantList });

    } catch (error) {
      logger.error('Error getting session participants:', error);
      res.status(500).json({ error: 'Failed to get session participants' });
    }
  }

  async updateSessionState(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { sessionId } = req.params;
      const stateUpdate: any = req.body;
      const userId = req.user.id;

      // Check if user has permission to update state using Prisma
      const participant = await prisma.sessionParticipant.findFirst({
        where: {
          sessionId: sessionId,
          userId: userId,
          isActive: true
        },
        include: {
          session: {
            select: {
              creatorId: true,
              roomId: true,
              state: true
            }
          }
        }
      });

      if (!participant) {
        res.status(403).json({ error: 'Permission denied or not a participant' });
        return;
      }

      const isCreator = participant.session.creatorId === userId;
      const isAdmin = participant.role === 'admin';

      if (!isCreator && !isAdmin) {
        res.status(403).json({ error: 'Insufficient permissions to update session state' });
        return;
      }

      const currentState = participant.session.state as any || {};
      const updatedState = { ...currentState, ...stateUpdate };

      // Update session state using Prisma
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          state: updatedState,
          lastActivity: new Date()
        }
      });

      // Publish state update event
      await this.eventPublisher.publishSessionEvent(
        sessionId,
        'state.updated',
        { stateUpdate },
        userId,
        participant.session.roomId
      );

      logger.info(`Session state updated: ${sessionId} by user ${userId}`);
      res.json({ state: updatedState });

    } catch (error) {
      logger.error('Error updating session state:', error);
      res.status(500).json({ error: 'Failed to update session state' });
    }
  }

  async getSessionState(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      // Get session state using Prisma
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          isActive: true
        },
        select: {
          state: true
        }
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.json({ state: session.state });

    } catch (error) {
      logger.error('Error getting session state:', error);
      res.status(500).json({ error: 'Failed to get session state' });
    }
  }

  async getUserSessionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      // Get user session history using Prisma
      const sessions = await prisma.sessionParticipant.findMany({
        where: {
          userId: userId
        },
        include: {
          session: {
            include: {
              room: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          joinedAt: 'desc'
        },
        take: Number(limit),
        skip: Number(offset)
      });

      const sessionHistory = sessions.map((sp: any) => ({
        id: sp.session.id,
        name: sp.session.name,
        roomName: sp.session.room.name,
        roomId: sp.session.roomId,
        joinedAt: sp.joinedAt,
        duration: sp.session.lastActivity.getTime() - sp.session.createdAt.getTime(),
        isActive: sp.session.isActive
      }));

      res.json({ sessions: sessionHistory });

    } catch (error) {
      logger.error('Error getting user session history:', error);
      res.status(500).json({ error: 'Failed to get session history' });
    }
  }
}

// Create and export a singleton instance
export const sessionController = new SessionController();
export default sessionController;
