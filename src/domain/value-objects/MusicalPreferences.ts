import { InvalidDataError } from '../../shared/errors/DomainError';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';
export type CollaborationStyle = 'leader' | 'follower' | 'flexible';

export interface TempoRange {
  min: number;
  max: number;
}

export interface CompatibilityScore {
  overallScore: number;
  breakdown: {
    genreCompatibility: number;
    instrumentCompatibility: number;
    experienceCompatibility: number;
    tempoCompatibility: number;
    collaborationStyleCompatibility: number;
  };
}

/**
 * Musical preferences value object containing all music-related user preferences
 */
export class MusicalPreferences {
  private readonly genres: readonly string[];
  private readonly instruments: readonly string[];
  private readonly experience: ExperienceLevel;
  private readonly collaborationStyle: CollaborationStyle;
  private readonly preferredTempo: Readonly<TempoRange>;
  private readonly preferredKeys: readonly string[];

  constructor(preferences: {
    genres?: string[];
    instruments?: string[];
    experience?: ExperienceLevel;
    collaborationStyle?: CollaborationStyle;
    preferredTempo?: TempoRange;
    preferredKeys?: string[];
  } = {}) {
    this.genres = Object.freeze([...new Set(preferences.genres?.map(g => g.trim().toLowerCase()) || [])]);
    this.instruments = Object.freeze([...new Set(preferences.instruments?.map(i => i.trim().toLowerCase()) || [])]);
    this.experience = preferences.experience || 'beginner';
    this.collaborationStyle = preferences.collaborationStyle || 'flexible';
    
    // Validate tempo range
    const tempo = preferences.preferredTempo || { min: 60, max: 140 };
    if (tempo.min >= tempo.max) {
      throw new InvalidDataError('Preferred tempo minimum must be less than maximum', 'preferredTempo');
    }
    if (tempo.min < 30 || tempo.max > 250) {
      throw new InvalidDataError('Tempo range must be between 30 and 250 BPM', 'preferredTempo');
    }
    this.preferredTempo = Object.freeze(tempo);
    
    this.preferredKeys = Object.freeze([...new Set(preferences.preferredKeys?.map(k => k.trim()) || [])]);
  }

  /**
   * Calculate compatibility with another user's musical preferences
   */
  public calculateCompatibilityWith(other: MusicalPreferences): CompatibilityScore {
    const genreScore = this.calculateArraySimilarity(this.genres, other.genres);
    const instrumentScore = this.calculateArraySimilarity(this.instruments, other.instruments);
    const experienceScore = this.calculateExperienceCompatibility(this.experience, other.experience);
    const tempoScore = this.calculateTempoCompatibility(this.preferredTempo, other.preferredTempo);
    const collaborationScore = this.calculateCollaborationStyleCompatibility(
      this.collaborationStyle, 
      other.collaborationStyle
    );

    // Weighted average - genres and instruments are most important
    const overallScore = (
      genreScore * 0.3 +
      instrumentScore * 0.25 +
      experienceScore * 0.2 +
      tempoScore * 0.15 +
      collaborationScore * 0.1
    );

    return {
      overallScore: Math.round(overallScore * 100) / 100,
      breakdown: {
        genreCompatibility: Math.round(genreScore * 100) / 100,
        instrumentCompatibility: Math.round(instrumentScore * 100) / 100,
        experienceCompatibility: Math.round(experienceScore * 100) / 100,
        tempoCompatibility: Math.round(tempoScore * 100) / 100,
        collaborationStyleCompatibility: Math.round(collaborationScore * 100) / 100,
      }
    };
  }

  /**
   * Update preferences while maintaining immutability
   */
  public update(updates: Partial<{
    genres: string[];
    instruments: string[];
    experience: ExperienceLevel;
    collaborationStyle: CollaborationStyle;
    preferredTempo: TempoRange;
    preferredKeys: string[];
  }>): MusicalPreferences {
    return new MusicalPreferences({
      genres: updates.genres || [...this.genres],
      instruments: updates.instruments || [...this.instruments],
      experience: updates.experience || this.experience,
      collaborationStyle: updates.collaborationStyle || this.collaborationStyle,
      preferredTempo: updates.preferredTempo || { ...this.preferredTempo },
      preferredKeys: updates.preferredKeys || [...this.preferredKeys],
    });
  }

  // Getters
  public getGenres(): readonly string[] { return this.genres; }
  public getInstruments(): readonly string[] { return this.instruments; }
  public getExperience(): ExperienceLevel { return this.experience; }
  public getCollaborationStyle(): CollaborationStyle { return this.collaborationStyle; }
  public getPreferredTempo(): Readonly<TempoRange> { return this.preferredTempo; }
  public getPreferredKeys(): readonly string[] { return this.preferredKeys; }

  private calculateArraySimilarity(arr1: readonly string[], arr2: readonly string[]): number {
    if (!arr1.length || !arr2.length) return 0;
    
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private calculateExperienceCompatibility(exp1: ExperienceLevel, exp2: ExperienceLevel): number {
    const levels = { beginner: 1, intermediate: 2, advanced: 3, professional: 4 };
    const diff = Math.abs(levels[exp1] - levels[exp2]);
    
    // More compatible if experience levels are closer
    return Math.max(0, 1 - (diff / 3));
  }

  private calculateTempoCompatibility(tempo1: TempoRange, tempo2: TempoRange): number {
    // Check for overlap in tempo ranges
    const overlapStart = Math.max(tempo1.min, tempo2.min);
    const overlapEnd = Math.min(tempo1.max, tempo2.max);
    
    if (overlapStart >= overlapEnd) return 0; // No overlap
    
    const overlapSize = overlapEnd - overlapStart;
    const totalRange = Math.max(tempo1.max, tempo2.max) - Math.min(tempo1.min, tempo2.min);
    
    return overlapSize / totalRange;
  }

  private calculateCollaborationStyleCompatibility(
    style1: CollaborationStyle, 
    style2: CollaborationStyle
  ): number {
    if (style1 === 'flexible' || style2 === 'flexible') return 1;
    if (style1 === style2) return 0.8; // Same style but not flexible
    if ((style1 === 'leader' && style2 === 'follower') || 
        (style1 === 'follower' && style2 === 'leader')) return 1; // Complementary
    return 0.3; // Different non-complementary styles
  }

  /**
   * Serialize to plain object for persistence
   */
  public toPlainObject(): {
    genres: string[];
    instruments: string[];
    experience: ExperienceLevel;
    collaborationStyle: CollaborationStyle;
    preferredTempo: TempoRange;
    preferredKeys: string[];
  } {
    return {
      genres: [...this.genres],
      instruments: [...this.instruments],
      experience: this.experience,
      collaborationStyle: this.collaborationStyle,
      preferredTempo: { ...this.preferredTempo },
      preferredKeys: [...this.preferredKeys],
    };
  }
}
