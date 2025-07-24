import { inject, injectable } from 'inversify';
import type { IRoomRepository } from '../../../domain/repositories/IRoomRepository';
import { RoomResponseDto } from '../../dto/RoomDto';
import { BusinessRuleViolationError } from '../../../shared/errors/DomainError';

@injectable()
export class GetRoomUseCase {
  constructor(
    private roomRepository: IRoomRepository
  ) {}

  async execute(roomId: string): Promise<RoomResponseDto> {
    const room = await this.roomRepository.findById(roomId);
    
    if (!room) {
      throw new BusinessRuleViolationError(`Room with id ${roomId} not found`);
    }

    return {
      id: room.getId(),
      name: room.getName(),
      description: room.getDescription(),
      creatorId: 'system', // TODO: Add creator tracking to Room entity
      genre: room.getGenre(),
      settings: {
        maxParticipants: 50, // TODO: Make configurable
        isPublic: true, // TODO: Add privacy settings
        requiresApproval: false,
        allowFileUpload: true,
        allowRecording: true
      },
      isActive: true, // TODO: Implement activity status
      participantCount: room.getParticipants().length,
      createdAt: room.getCreatedAt(),
      updatedAt: room.getUpdatedAt()
    };
  }
}
