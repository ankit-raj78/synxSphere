// Room-related DTOs for application layer

export interface CreateRoomDto {
  name: string;
  description?: string;
  genre?: string;
  settings?: {
    maxParticipants?: number;
    isPublic?: boolean;
    requiresApproval?: boolean;
    allowFileUpload?: boolean;
    allowRecording?: boolean;
    targetTempo?: number;
    targetKey?: string;
  };
}

export interface UpdateRoomDto {
  name?: string;
  description?: string;
  genre?: string;
}

export interface UpdateRoomSettingsDto {
  maxParticipants?: number;
  isPublic?: boolean;
  requiresApproval?: boolean;
  allowFileUpload?: boolean;
  allowRecording?: boolean;
  targetTempo?: number;
  targetKey?: string;
}

export interface RoomResponseDto {
  id: string;
  name: string;
  description: string | null;
  creatorId: string;
  genre: string | null;
  settings: {
    maxParticipants: number;
    isPublic: boolean;
    requiresApproval: boolean;
    allowFileUpload: boolean;
    allowRecording: boolean;
    targetTempo?: number;
    targetKey?: string;
  };
  isActive: boolean;
  participantCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomParticipantDto {
  userId: string;
  username: string;
  role: 'creator' | 'moderator' | 'participant';
  joinedAt: Date;
  lastActive: Date;
}

export interface RoomWithParticipantsDto extends RoomResponseDto {
  participants: RoomParticipantDto[];
  activeParticipants: RoomParticipantDto[];
}

export interface JoinRoomDto {
  roomId: string;
  userId: string;
}

export interface PaginatedRoomsDto {
  rooms: RoomResponseDto[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
  };
}

export interface FindRoomsQuery {
  page?: number;
  limit?: number;
  search?: string;
  genre?: string;
  isPublic?: boolean;
  creatorId?: string;
  participantId?: string;
}

export interface RoomRecommendationDto extends RoomResponseDto {
  compatibilityScore: number;
  matchingFactors: string[];
}

export interface RoomStatisticsDto {
  totalRooms: number;
  activeRooms: number;
  averageParticipants: number;
  popularGenres: Array<{
    genre: string;
    count: number;
  }>;
  recentActivity: Array<{
    roomId: string;
    roomName: string;
    activityType: 'created' | 'joined' | 'left';
    timestamp: Date;
  }>;
}
