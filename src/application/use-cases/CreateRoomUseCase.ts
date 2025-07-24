import { Room } from '../../domain/entities/Room';
import { IRoomRepository } from '../../domain/repositories/IRoomRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { RoomDomainService } from '../../domain/services/RoomDomainService';
import { RoomCreatedEvent } from '../../domain/events/RoomEvents';
import { EntityNotFoundError } from '../../shared/errors/DomainError';
import { CreateRoomDto, RoomResponseDto } from '../dto/RoomDto';
import { RoomMapper } from '../mappers/RoomMapper';

/**
 * Use case for creating a new collaboration room
 */
export class CreateRoomUseCase {
  constructor(
    private readonly roomRepository: IRoomRepository,
    private readonly userRepository: IUserRepository,
    private readonly roomDomainService: RoomDomainService,
    private readonly eventPublisher?: (event: any) => Promise<void>
  ) {}

  async execute(dto: CreateRoomDto, creatorId: string): Promise<RoomResponseDto> {
    // Validate creator exists
    const creator = await this.userRepository.findById(creatorId);
    if (!creator) {
      throw new EntityNotFoundError('User', creatorId);
    }

    // Check room creation limits
    await this.roomDomainService.validateRoomCreationLimits(creatorId);

    // Validate settings if provided
      if (dto.settings) {
        await this.roomDomainService.validateRoomConstraints({
          maxParticipants: dto.settings.maxParticipants || 50,
          genre: dto.genre || 'general',
          isPrivate: !dto.settings.isPublic,
          maxFileSize: 50 * 1024 * 1024, // 50MB default
          allowedFormats: ['mp3', 'wav', 'flac']
        }, this.roomRepository);
      }

    // Create room entity
    const room = Room.create({
      name: dto.name,
      description: dto.description,
      creatorId,
      genre: dto.genre,
      settings: dto.settings,
    });

    // Add creator as first participant - need to fix this in Room entity
    // The Room.create method should handle this internally

    // Save room
    await this.roomRepository.save(room);

    // Publish domain event
    if (this.eventPublisher) {
      const event = new RoomCreatedEvent({
        roomId: room.getId(),
        name: room.getName(),
        creatorId,
        isPublic: true, // TODO: Get from room settings
        maxParticipants: 50, // TODO: Get from room settings
        genres: dto.genre ? [dto.genre] : []
      });
      await this.eventPublisher(event);
    }

    return RoomMapper.toResponseDto(room);
  }
}
