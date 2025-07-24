import { injectable, inject } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { UserMapper } from '../../application/mappers/UserMapper';
import { EntityNotFoundError } from '../../shared/errors/DomainError';
import { TYPES } from '../container/types';

/**
 * Prisma implementation of the User repository
 * Handles all database operations for User entities
 */
@injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(@inject(TYPES.PrismaClient) private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    try {
      const userData = await this.prisma.user.findUnique({
        where: { id }
      });
      
      return userData ? UserMapper.toDomain(userData) : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const userData = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });
      
      return userData ? UserMapper.toDomain(userData) : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    try {
      const userData = await this.prisma.user.findUnique({
        where: { username }
      });
      
      return userData ? UserMapper.toDomain(userData) : null;
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  async emailExists(email: string): Promise<boolean> {
    try {
      const count = await this.prisma.user.count({
        where: { email: email.toLowerCase() }
      });
      return count > 0;
    } catch (error) {
      console.error('Error checking email existence:', error);
      throw error;
    }
  }

  async usernameExists(username: string): Promise<boolean> {
    try {
      const count = await this.prisma.user.count({
        where: { username }
      });
      return count > 0;
    } catch (error) {
      console.error('Error checking username existence:', error);
      throw error;
    }
  }

  async save(user: User): Promise<void> {
    try {
      const data = UserMapper.toPersistence(user);
      
      await this.prisma.user.upsert({
        where: { id: user.getId() },
        update: {
          email: data.email,
          username: data.username,
          password: data.passwordHash,
          profile: data.profile,
          updatedAt: data.updatedAt
        },
        create: {
          id: data.id,
          email: data.email,
          username: data.username,
          password: data.passwordHash,
          profile: data.profile,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        }
      });
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const deletedUser = await this.prisma.user.delete({
        where: { id }
      });
      
      if (!deletedUser) {
        throw new EntityNotFoundError('User', id);
      }
    } catch (error: any) {
      if (error.code === 'P2025') { // Prisma error code for record not found
        throw new EntityNotFoundError('User', id);
      }
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async findMany(options: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }): Promise<{
    users: User[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 10, 100); // Cap at 100
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      
      if (options.search) {
        where.OR = [
          { username: { contains: options.search, mode: 'insensitive' } },
          { email: { contains: options.search, mode: 'insensitive' } }
        ];
      }

      if (options.role) {
        where.profile = {
          path: ['role'],
          equals: options.role
        };
      }

      // Execute queries in parallel
      const [userData, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.user.count({ where })
      ]);

      const users = userData.map(data => UserMapper.toDomain(data));
      const hasMore = skip + userData.length < total;

      return { users, total, hasMore };
    } catch (error) {
      console.error('Error finding users:', error);
      throw error;
    }
  }

  async findByMusicalPreferences(preferences: {
    genres?: string[];
    instruments?: string[];
    experience?: string;
    collaborationStyle?: string;
  }): Promise<User[]> {
    try {
      const where: any = {};

      // Build JSON queries for musical preferences
      if (preferences.genres && preferences.genres.length > 0) {
        where.profile = {
          ...where.profile,
          path: ['musicalPreferences', 'genres'],
          array_contains: preferences.genres
        };
      }

      if (preferences.instruments && preferences.instruments.length > 0) {
        where.profile = {
          ...where.profile,
          path: ['musicalPreferences', 'instruments'],
          array_contains: preferences.instruments
        };
      }

      if (preferences.experience) {
        where.profile = {
          ...where.profile,
          path: ['musicalPreferences', 'experience'],
          equals: preferences.experience
        };
      }

      if (preferences.collaborationStyle) {
        where.profile = {
          ...where.profile,
          path: ['musicalPreferences', 'collaborationStyle'],
          equals: preferences.collaborationStyle
        };
      }

      const userData = await this.prisma.user.findMany({
        where,
        take: 50 // Limit results for performance
      });

      return userData.map(data => UserMapper.toDomain(data));
    } catch (error) {
      console.error('Error finding users by musical preferences:', error);
      throw error;
    }
  }

  async count(): Promise<number> {
    try {
      return await this.prisma.user.count();
    } catch (error) {
      console.error('Error counting users:', error);
      throw error;
    }
  }
}
