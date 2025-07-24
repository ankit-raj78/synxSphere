import { Room } from '../../domain/entities/Room';
import {
  RoomResponseDto,
  RoomWithParticipantsDto,
  RoomParticipantDto,
  PaginatedRoomsDto,
  RoomRecommendationDto,
} from '../dto/RoomDto';

/**
 * Mapper class to convert between Room domain entities and DTOs
 */
export class RoomMapper {
  /**
   * Convert Room entity to response DTO
   */
  static toResponseDto(room: Room): RoomResponseDto {
    const settings = room.getSettings();
    
    return {
      id: room.getId(),
      name: room.getName(),
      description: room.getDescription(),
      creatorId: room.getCreatorId(),
      genre: room.getGenre(),
      settings: {
        maxParticipants: settings.maxParticipants,
        isPublic: settings.isPublic,
        requiresApproval: settings.requiresApproval,
        allowFileUpload: settings.allowFileUpload,
        allowRecording: settings.allowRecording,
        targetTempo: settings.targetTempo,
        targetKey: settings.targetKey,
      },
      isActive: room.getIsActive(),
      participantCount: room.getParticipantCount(),
      createdAt: room.getCreatedAt(),
      updatedAt: room.getUpdatedAt(),
    };
  }

  /**
   * Convert Room entity to detailed DTO with participants
   */
  static toDetailedDto(room: Room): RoomWithParticipantsDto {
    const baseDto = this.toResponseDto(room);
    const participants = room.getParticipants();
    const activeParticipants = room.getActiveParticipants();

    return {
      ...baseDto,
      participants: participants.map(p => this.toParticipantDto(p)),
      activeParticipants: activeParticipants.map(p => this.toParticipantDto(p)),
    };
  }

  /**
   * Convert room participant to DTO
   */
  static toParticipantDto(participant: {
    userId: string;
    username: string;
    role: 'creator' | 'moderator' | 'participant';
    joinedAt: Date;
    lastActive: Date;
  }): RoomParticipantDto {
    return {
      userId: participant.userId,
      username: participant.username,
      role: participant.role,
      joinedAt: participant.joinedAt,
      lastActive: participant.lastActive,
    };
  }

  /**
   * Convert paginated rooms to DTO
   */
  static toPaginatedDto(
    rooms: Room[],
    total: number,
    page: number,
    limit: number
  ): PaginatedRoomsDto {
    const totalPages = Math.ceil(total / limit);
    
    return {
      rooms: rooms.map(room => this.toResponseDto(room)),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasMore: page < totalPages,
      },
    };
  }

  /**
   * Convert room with compatibility score to recommendation DTO
   */
  static toRecommendationDto(
    room: Room,
    compatibilityScore: number,
    matchingFactors: string[]
  ): RoomRecommendationDto {
    const baseDto = this.toResponseDto(room);
    
    return {
      ...baseDto,
      compatibilityScore,
      matchingFactors,
    };
  }

  /**
   * Convert array of recommended rooms to DTOs
   */
  static toRecommendationDtos(
    rooms: Room[],
    scores?: number[]
  ): RoomRecommendationDto[] {
    return rooms.map((room, index) => {
      const score = scores?.[index] || 0;
      const matchingFactors: string[] = [];
      
      // Determine matching factors based on room properties
      if (room.getGenre()) {
        matchingFactors.push(`Genre: ${room.getGenre()}`);
      }
      
      if (room.getSettings().targetTempo) {
        matchingFactors.push(`Tempo: ${room.getSettings().targetTempo} BPM`);
      }
      
      if (room.getParticipantCount() > 1) {
        matchingFactors.push(`Active participants: ${room.getParticipantCount()}`);
      }

      return this.toRecommendationDto(room, score, matchingFactors);
    });
  }

  /**
   * Convert from persistence layer to domain entity
   */
  static toDomain(data: {
    id: string;
    name: string;
    description: string | null;
    creatorId: string;
    genre: string | null;
    isLive: boolean; // Note: Prisma uses isLive, we map to isActive
    settings: any;
    createdAt: Date;
    updatedAt: Date;
    participants?: Array<{
      userId: string;
      user: { username: string };
      role: string;
      joinedAt: Date;
    }>;
  }): Room {
    return Room.fromPersistence({
      id: data.id,
      name: data.name,
      description: data.description,
      creatorId: data.creatorId,
      genre: data.genre,
      settings: typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings,
      isActive: data.isLive, // Map isLive to isActive
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      participants: data.participants?.map(p => ({
        userId: p.userId,
        username: p.user.username,
        role: p.role as any,
        joinedAt: p.joinedAt,
        lastActive: p.joinedAt, // Use joinedAt as default since lastActive doesn't exist in schema
      })),
    });
  }

  /**
   * Convert domain entity to persistence format
   */
  static toPersistence(room: Room): {
    id: string;
    name: string;
    description: string | null;
    creatorId: string;
    genre: string | null;
    settings: object;
    isLive: boolean; // Map isActive to isLive for Prisma
    createdAt: Date;
    updatedAt: Date;
  } {
    const data = room.toPersistence();
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      creatorId: data.creatorId,
      genre: data.genre,
      settings: data.settings,
      isLive: data.isActive, // Map isActive to isLive for Prisma
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
