// User-related DTOs for application layer

export interface CreateUserDto {
  email: string;
  username: string;
  password: string;
  profile?: {
    bio?: string;
    avatar?: string;
    musicalPreferences?: {
      genres?: string[];
      instruments?: string[];
      experience?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
      collaborationStyle?: 'leader' | 'follower' | 'flexible';
      preferredTempo?: {
        min: number;
        max: number;
      };
      preferredKeys?: string[];
    };
  };
}

export interface UpdateUserDto {
  email?: string;
  username?: string;
  profile?: {
    bio?: string;
    avatar?: string | null;
    musicalPreferences?: {
      genres?: string[];
      instruments?: string[];
      experience?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
      collaborationStyle?: 'leader' | 'follower' | 'flexible';
      preferredTempo?: {
        min: number;
        max: number;
      };
      preferredKeys?: string[];
    };
  };
}

export interface UserResponseDto {
  id: string;
  email: string;
  username: string;
  profile: {
    role: 'user' | 'admin' | 'moderator';
    bio: string;
    avatar: string | null;
    musicalPreferences: {
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
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublicDto {
  id: string;
  username: string;
  profile: {
    role: 'user' | 'admin' | 'moderator';
    bio: string;
    avatar: string | null;
    musicalPreferences: {
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
  };
  createdAt: Date;
}

export interface CompatibilityDto {
  userId: string;
  username: string;
  overallScore: number;
  breakdown: {
    genreCompatibility: number;
    instrumentCompatibility: number;
    experienceCompatibility: number;
    tempoCompatibility: number;
    collaborationStyleCompatibility: number;
  };
}

export interface PaginatedUsersDto {
  users: UserPublicDto[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
  };
}

export interface FindUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'user' | 'admin' | 'moderator';
  genres?: string[];
  instruments?: string[];
  experience?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  collaborationStyle?: 'leader' | 'follower' | 'flexible';
}

export interface UpdateMusicalPreferencesDto {
  genres?: string[];
  instruments?: string[];
  experience?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  collaborationStyle?: 'leader' | 'follower' | 'flexible';
  preferredTempo?: {
    min: number;
    max: number;
  };
  preferredKeys?: string[];
}
