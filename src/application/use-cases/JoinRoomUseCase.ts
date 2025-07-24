import { IRoomRepository } from '../../domain/repositories/IRoomRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { RoomDomainService } from '../../domain/services/RoomDomainService';
import { UserJoinedRoomEvent, UserLeftRoomEvent } from '../../domain/events/RoomEvents';
import { EntityNotFoundError, InsufficientPermissionsError } from '../../shared/errors/DomainError';
import { JoinRoomDto, RoomWithParticipantsDto } from '../dto/RoomDto';
import { RoomMapper } from '../mappers/RoomMapper';

/**
 * Use case for joining a room
 */
export class JoinRoomUseCase {
  constructor(
    private readonly roomRepository: IRoomRepository,
    private readonly userRepository: IUserRepository,
    private readonly roomDomainService: RoomDomainService,
    private readonly eventPublisher?: (event: any) => Promise<void>
  ) {}

  async execute(dto: JoinRoomDto): Promise<RoomWithParticipantsDto> {
    // Find room
    const room = await this.roomRepository.findById(dto.roomId);
    if (!room) {
      throw new EntityNotFoundError('Room', dto.roomId);
    }

    // Find user
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new EntityNotFoundError('User', dto.userId);
    }

    // Validate user can join room
    await this.roomDomainService.validateUserCanJoinRoom(room, dto.userId);

    // Add user to room
    room.addParticipant(dto.userId, user.getUsername());

    // Save updated room
    await this.roomRepository.save(room);

    // Publish domain event
    if (this.eventPublisher) {
      const event = new UserJoinedRoomEvent({
        roomId: dto.roomId,
        userId: dto.userId,
        username: user.getUsername(),
        participantCount: room.getParticipants().length,
        joinedAt: new Date()
      });
      await this.eventPublisher(event);
    }

    return RoomMapper.toDetailedDto(room);
  }
}

/**
 * Use case for leaving a room
 */
export class LeaveRoomUseCase {
  constructor(
    private readonly roomRepository: IRoomRepository,
    private readonly userRepository: IUserRepository,
    private readonly eventPublisher?: (event: any) => Promise<void>
  ) {}

  async execute(roomId: string, userId: string, requestingUserId: string): Promise<RoomWithParticipantsDto> {
    // Find room
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new EntityNotFoundError('Room', roomId);
    }

    // Find user being removed
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundError('User', userId);
    }

    // Remove participant (this handles permission checking internally)
    room.removeParticipant(userId, requestingUserId);

    // Save updated room
    await this.roomRepository.save(room);

    // Publish event
    if (this.eventPublisher) {
      const event = new UserLeftRoomEvent({
        roomId: room.getId(),
        userId,
        username: user.getUsername(),
        participantCount: room.getParticipants().length,
        leftAt: new Date()
      });
      await this.eventPublisher(event);
    }

    return RoomMapper.toDetailedDto(room);
  }
}

/**
 * Use case for promoting a user to moderator
 */
export class PromoteUserUseCase {
  constructor(
    private readonly roomRepository: IRoomRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(roomId: string, userId: string, requestingUserId: string): Promise<RoomWithParticipantsDto> {
    // Find room
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new EntityNotFoundError('Room', roomId);
    }

    // Verify requesting user exists
    const requestingUser = await this.userRepository.findById(requestingUserId);
    if (!requestingUser) {
      throw new EntityNotFoundError('User', requestingUserId);
    }

    // Promote user (this handles permission checking internally)
    room.promoteToModerator(userId, requestingUserId);

    // Save updated room
    await this.roomRepository.save(room);

    return RoomMapper.toDetailedDto(room);
  }
}

/**
 * Use case for updating participant activity
 */
export class UpdateParticipantActivityUseCase {
  constructor(private readonly roomRepository: IRoomRepository) {}

  async execute(roomId: string, userId: string): Promise<void> {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      return; // Silently fail for activity updates
    }

    room.updateParticipantActivity(userId);
    await this.roomRepository.save(room);
  }
}
