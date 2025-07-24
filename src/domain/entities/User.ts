import { generateId } from '../../shared/utils';
import { DomainError, InvalidDataError, BusinessRuleViolationError } from '../../shared/errors/DomainError';
import { Email } from '../value-objects/Email';
import { Username } from '../value-objects/Username';
import { UserProfile, UserRole } from '../value-objects/UserProfile';
import { MusicalPreferences, CompatibilityScore } from '../value-objects/MusicalPreferences';

/**
 * User domain entity representing a user in the system
 * Contains all business logic related to user operations
 */
export class User {
  private constructor(
    private readonly id: string,
    private email: Email,
    private username: Username,
    private readonly passwordHash: string,
    private profile: UserProfile,
    private readonly createdAt: Date,
    private updatedAt: Date
  ) {}

  /**
   * Factory method to create a new user
   */
  public static create(params: {
    email: string;
    username: string;
    passwordHash: string;
    profile?: Partial<{
      role: UserRole;
      musicalPreferences: MusicalPreferences;
      bio: string;
      avatar: string | null;
    }>;
  }): User {
    const email = new Email(params.email);
    const username = new Username(params.username);
    
    if (!params.passwordHash) {
      throw new InvalidDataError('Password hash is required', 'passwordHash');
    }

    const profile = new UserProfile(params.profile);

    return new User(
      generateId(),
      email,
      username,
      params.passwordHash,
      profile,
      new Date(),
      new Date()
    );
  }

  /**
   * Factory method to reconstruct user from persistence layer
   */
  public static fromPersistence(data: {
    id: string;
    email: string;
    username: string;
    passwordHash: string;
    profile: any; // JSON from database
    createdAt: Date;
    updatedAt: Date;
  }): User {
    const email = new Email(data.email);
    const username = new Username(data.username);
    
    // Reconstruct profile from JSON
    const profileData = typeof data.profile === 'string' ? JSON.parse(data.profile) : data.profile;
    const musicalPreferences = new MusicalPreferences(profileData.musicalPreferences);
    const profile = new UserProfile({
      role: profileData.role,
      musicalPreferences,
      bio: profileData.bio,
      avatar: profileData.avatar,
    });

    return new User(
      data.id,
      email,
      username,
      data.passwordHash,
      profile,
      data.createdAt,
      data.updatedAt
    );
  }

  /**
   * Update user's email address
   */
  public changeEmail(newEmail: string): void {
    const email = new Email(newEmail);
    
    if (this.email.equals(email)) {
      throw new BusinessRuleViolationError('New email must be different from current email');
    }

    this.email = email;
    this.updatedAt = new Date();
  }

  /**
   * Update user's username
   */
  public changeUsername(newUsername: string): void {
    const username = new Username(newUsername);
    
    if (this.username.equals(username)) {
      throw new BusinessRuleViolationError('New username must be different from current username');
    }

    this.username = username;
    this.updatedAt = new Date();
  }

  /**
   * Update user's profile
   */
  public updateProfile(updates: Partial<{
    role: UserRole;
    musicalPreferences: MusicalPreferences;
    bio: string;
    avatar: string | null;
  }>): void {
    // Only admins can change roles
    if (updates.role && updates.role !== this.profile.getRole()) {
      throw new BusinessRuleViolationError('Role changes must be performed by an administrator');
    }

    this.profile = this.profile.update(updates);
    this.updatedAt = new Date();
  }

  /**
   * Update only musical preferences
   */
  public updateMusicalPreferences(preferences: Partial<{
    genres: string[];
    instruments: string[];
    experience: any;
    collaborationStyle: any;
    preferredTempo: any;
    preferredKeys: string[];
  }>): void {
    const currentPrefs = this.profile.getMusicalPreferences();
    const updatedPrefs = currentPrefs.update(preferences);
    
    this.profile = this.profile.update({
      musicalPreferences: updatedPrefs
    });
    this.updatedAt = new Date();
  }

  /**
   * Calculate compatibility score with another user
   */
  public calculateCompatibilityWith(other: User): CompatibilityScore {
    const myPreferences = this.profile.getMusicalPreferences();
    const otherPreferences = other.profile.getMusicalPreferences();
    
    return myPreferences.calculateCompatibilityWith(otherPreferences);
  }

  /**
   * Check if user can perform administrative actions
   */
  public canAdministrate(): boolean {
    return this.profile.isAdmin();
  }

  /**
   * Check if user can moderate content/users
   */
  public canModerate(): boolean {
    return this.profile.canModerate();
  }

  /**
   * Update last login timestamp
   */
  public updateLastLogin(): void {
    this.updatedAt = new Date();
  }

  /**
   * Check if this user can edit another user's profile
   */
  public canEditUser(targetUser: User): boolean {
    // Users can edit their own profile
    if (this.id === targetUser.id) {
      return true;
    }
    
    // Admins can edit any user
    if (this.profile.isAdmin()) {
      return true;
    }
    
    return false;
  }

  /**
   * Get user's public information (safe for external consumption)
   */
  public getPublicInfo(): {
    id: string;
    username: string;
    profile: {
      role: UserRole;
      bio: string;
      avatar: string | null;
      musicalPreferences: ReturnType<MusicalPreferences['toPlainObject']>;
    };
    createdAt: Date;
  } {
    return {
      id: this.id,
      username: this.username.getValue(),
      profile: {
        role: this.profile.getRole(),
        bio: this.profile.getBio(),
        avatar: this.profile.getAvatar(),
        musicalPreferences: this.profile.getMusicalPreferences().toPlainObject(),
      },
      createdAt: this.createdAt,
    };
  }

  // Getters for read-only access
  public getId(): string { return this.id; }
  public getEmail(): string { return this.email.getValue(); }
  public getUsername(): string { return this.username.getValue(); }
  public getPasswordHash(): string { return this.passwordHash; }
  public getProfile(): UserProfile { return this.profile; }
  public getCreatedAt(): Date { return this.createdAt; }
  public getUpdatedAt(): Date { return this.updatedAt; }

  /**
   * Convert to persistence format
   */
  public toPersistence(): {
    id: string;
    email: string;
    username: string;
    passwordHash: string;
    profile: object;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      email: this.email.getValue(),
      username: this.username.getValue(),
      passwordHash: this.passwordHash,
      profile: this.profile.toPlainObject(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
