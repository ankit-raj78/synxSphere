import { InvalidDataError } from '../../shared/errors/DomainError';
import { MusicalPreferences } from './MusicalPreferences';

export type UserRole = 'user' | 'admin' | 'moderator';

/**
 * User profile value object containing all profile information
 */
export class UserProfile {
  private readonly role: UserRole;
  private readonly musicalPreferences: MusicalPreferences;
  private readonly bio: string;
  private readonly avatar: string | null;

  constructor(profile: {
    role?: UserRole;
    musicalPreferences?: MusicalPreferences;
    bio?: string;
    avatar?: string | null;
  } = {}) {
    this.role = profile.role || 'user';
    this.musicalPreferences = profile.musicalPreferences || new MusicalPreferences();
    
    // Validate bio length if provided
    const bio = profile.bio?.trim() || '';
    if (bio.length > 500) {
      throw new InvalidDataError('Bio cannot exceed 500 characters', 'bio');
    }
    this.bio = bio;
    
    // Validate avatar URL if provided
    this.avatar = profile.avatar?.trim() || null;
    if (this.avatar && !this.isValidUrl(this.avatar)) {
      throw new InvalidDataError('Invalid avatar URL format', 'avatar');
    }
  }

  /**
   * Update profile while maintaining immutability
   */
  public update(updates: Partial<{
    role: UserRole;
    musicalPreferences: MusicalPreferences;
    bio: string;
    avatar: string | null;
  }>): UserProfile {
    return new UserProfile({
      role: updates.role || this.role,
      musicalPreferences: updates.musicalPreferences || this.musicalPreferences,
      bio: updates.bio !== undefined ? updates.bio : this.bio,
      avatar: updates.avatar !== undefined ? updates.avatar : this.avatar,
    });
  }

  /**
   * Check if user has admin privileges
   */
  public isAdmin(): boolean {
    return this.role === 'admin';
  }

  /**
   * Check if user has moderator or admin privileges
   */
  public canModerate(): boolean {
    return this.role === 'admin' || this.role === 'moderator';
  }

  // Getters
  public getRole(): UserRole { return this.role; }
  public getMusicalPreferences(): MusicalPreferences { return this.musicalPreferences; }
  public getBio(): string { return this.bio; }
  public getAvatar(): string | null { return this.avatar; }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Serialize to plain object for persistence
   */
  public toPlainObject(): {
    role: UserRole;
    musicalPreferences: ReturnType<MusicalPreferences['toPlainObject']>;
    bio: string;
    avatar: string | null;
  } {
    return {
      role: this.role,
      musicalPreferences: this.musicalPreferences.toPlainObject(),
      bio: this.bio,
      avatar: this.avatar,
    };
  }
}
