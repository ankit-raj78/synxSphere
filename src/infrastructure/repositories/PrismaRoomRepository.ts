import { injectable, inject } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { IRoomRepository } from '../../domain/repositories/IRoomRepository';
import { Room } from '../../domain/entities/Room';
import { RoomMapper } from '../../application/mappers/RoomMapper';
import { EntityNotFoundError } from '../../shared/errors/DomainError';
import { TYPES } from '../container/types';

/**
 * Prisma implementation of the Room repository
 */
@injectable()
export class PrismaRoomRepository implements IRoomRepository {
  constructor(@inject(TYPES.PrismaClient) private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Room | null> {
    try {
      const roomData = await this.prisma.room.findUnique({
        where: { id },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  username: true
                }
              }
            }
          }
        }
      });
      
      return roomData ? RoomMapper.toDomain(roomData) : null;
    } catch (error) {
      console.error('Error finding room by ID:', error);
      throw error;
    }
  }

  async save(room: Room): Promise<void> {
    try {
      const data = RoomMapper.toPersistence(room);
      
      await this.prisma.room.upsert({
        where: { id: room.getId() },
        update: {
          name: data.name,
          description: data.description,
          genre: data.genre,
          settings: data.settings,
          isLive: data.isLive,
          updatedAt: data.updatedAt
        },
        create: {
          id: data.id,
          name: data.name,
          description: data.description,
          creatorId: data.creatorId,
          genre: data.genre,
          settings: data.settings,
          isLive: data.isLive,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        }
      });

      // Handle participants separately if needed
      // This is a simplified version - in reality you'd need to sync participants
    } catch (error) {
      console.error('Error saving room:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const deletedRoom = await this.prisma.room.delete({
        where: { id }
      });
      
      if (!deletedRoom) {
        throw new EntityNotFoundError('Room', id);
      }
    } catch (error: any) {
      if (error.code === 'P2025') { // Prisma error code for record not found
        throw new EntityNotFoundError('Room', id);
      }
      console.error('Error deleting room:', error);
      throw error;
    }
  }

  async findByCreator(creatorId: string): Promise<Room[]> {
    try {
      const roomsData = await this.prisma.room.findMany({
        where: { creatorId },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  username: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return roomsData.map(data => RoomMapper.toDomain(data));
    } catch (error) {
      console.error('Error finding rooms by creator:', error);
      throw error;
    }
  }

  async findByParticipant(userId: string): Promise<Room[]> {
    try {
      const roomsData = await this.prisma.room.findMany({
        where: {
          participants: {
            some: {
              userId
            }
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  username: true
                }
              }
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      return roomsData.map(data => RoomMapper.toDomain(data));
    } catch (error) {
      console.error('Error finding rooms by participant:', error);
      throw error;
    }
  }

  async findPublicRooms(options: {
    page?: number;
    limit?: number;
    genre?: string;
    search?: string;
  }): Promise<{
    rooms: Room[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 10, 50);
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        isLive: true,
        settings: {
          path: ['isPublic'],
          equals: true
        }
      };

      if (options.genre) {
        where.genre = options.genre;
      }

      if (options.search) {
        where.OR = [
          { name: { contains: options.search, mode: 'insensitive' } },
          { description: { contains: options.search, mode: 'insensitive' } }
        ];
      }

      // Execute queries in parallel
      const [roomsData, total] = await Promise.all([
        this.prisma.room.findMany({
          where,
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    username: true
                  }
                }
              }
            }
          },
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' }
        }),
        this.prisma.room.count({ where })
      ]);

      const rooms = roomsData.map(data => RoomMapper.toDomain(data));
      const hasMore = skip + roomsData.length < total;

      return { rooms, total, hasMore };
    } catch (error) {
      console.error('Error finding public rooms:', error);
      throw error;
    }
  }

  async findActiveRooms(options: {
    page?: number;
    limit?: number;
  }): Promise<Room[]> {
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 10, 50);
      const skip = (page - 1) * limit;

      // Consider rooms active if they have activity in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const roomsData = await this.prisma.room.findMany({
        where: {
          isLive: true,
          updatedAt: { gte: oneHourAgo }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  username: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' }
      });

      return roomsData.map(data => RoomMapper.toDomain(data));
    } catch (error) {
      console.error('Error finding active rooms:', error);
      throw error;
    }
  }

  async count(): Promise<number> {
    try {
      return await this.prisma.room.count();
    } catch (error) {
      console.error('Error counting rooms:', error);
      throw error;
    }
  }

  async countByCreator(creatorId: string): Promise<number> {
    try {
      return await this.prisma.room.count({
        where: { creatorId }
      });
    } catch (error) {
      console.error('Error counting rooms by creator:', error);
      throw error;
    }
  }
}
