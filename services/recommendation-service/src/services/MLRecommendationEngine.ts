import { Matrix } from 'ml-matrix';
import { kmeans } from 'ml-kmeans';
import { 
  User, 
  UserProfile, 
  AudioFeatures, 
  MusicalCompatibilityScore,
  MLModelPrediction,
  CollaborationRoom 
} from '../../../shared/types';
import logger from '../utils/logger';

export class MLRecommendationEngine {
  private userClusters: Map<string, number> = new Map();
  private clusterCenters: number[][] = [];
  private featureWeights: number[] = [0.2, 0.25, 0.15, 0.15, 0.15, 0.1]; // Genre, Instrument, Tempo, Experience, Style, Audio

  /**
   * Extract numerical features from user profile for ML processing
   */
  private extractUserFeatures(user: User, audioFeatures?: AudioFeatures): number[] {
    const profile = user.profile;
    const features: number[] = [];

    // Genre diversity (0-1)
    const genreCount = profile.musicalPreferences?.genres?.length || 0;
    features.push(Math.min(genreCount / 10, 1));

    // Instrument count (0-1)
    const instrumentCount = profile.musicalPreferences?.instruments?.length || 0;
    features.push(Math.min(instrumentCount / 5, 1));

    // Experience level (0-1)
    const experienceMap = { beginner: 0.25, intermediate: 0.5, advanced: 0.75, professional: 1.0 };
    features.push(experienceMap[profile.musicalPreferences?.experience || 'beginner']);

    // Collaboration style (0-1)
    const styleMap = { leader: 1.0, flexible: 0.5, follower: 0.0 };
    features.push(styleMap[profile.musicalPreferences?.collaborationStyle || 'flexible']);

    // Tempo preference (normalized)
    const tempoMin = profile.musicalPreferences?.preferredTempo?.min || 120;
    const tempoMax = profile.musicalPreferences?.preferredTempo?.max || 140;
    features.push((tempoMin + tempoMax) / 400); // Normalize around 200 BPM max

    // Audio features (if available)
    if (audioFeatures) {
      features.push(
        audioFeatures.energy || 0.5,
        audioFeatures.loudness / 100 + 0.5, // Normalize loudness
        audioFeatures.harmonicComplexity || 0.5,
        audioFeatures.rhythmicComplexity || 0.5
      );
    } else {
      features.push(0.5, 0.5, 0.5, 0.5); // Default values
    }

    return features;
  }

  /**
   * Cluster users based on musical preferences and features
   */
  async clusterUsers(users: User[], audioFeaturesMap: Map<string, AudioFeatures>): Promise<void> {
    try {
      logger.info(`Clustering ${users.length} users`);

      const userFeatures = users.map(user => {
        const audioFeatures = audioFeaturesMap.get(user.id);
        return this.extractUserFeatures(user, audioFeatures);
      });      const dataMatrix = new Matrix(userFeatures);
      const k = Math.min(Math.max(Math.floor(users.length / 10), 3), 10); // 3-10 clusters
      
      const result = kmeans(userFeatures, k, {
        maxIterations: 100
      });

      // Store cluster assignments
      users.forEach((user, index) => {
        this.userClusters.set(user.id, result.clusters[index]);
      });

      this.clusterCenters = result.centroids;
      
      logger.info(`Successfully created ${k} user clusters`);
    } catch (error) {
      logger.error('Error clustering users:', error);
      throw error;
    }
  }

  /**
   * Calculate advanced musical compatibility using ML techniques
   */
  calculateMusicalCompatibility(
    user1: User, 
    user2: User, 
    audioFeatures1?: AudioFeatures, 
    audioFeatures2?: AudioFeatures
  ): MusicalCompatibilityScore {
    const features1 = this.extractUserFeatures(user1, audioFeatures1);
    const features2 = this.extractUserFeatures(user2, audioFeatures2);

    // Calculate weighted Euclidean distance
    let weightedDistance = 0;
    for (let i = 0; i < features1.length && i < this.featureWeights.length; i++) {
      const diff = features1[i] - features2[i];
      weightedDistance += this.featureWeights[i] * diff * diff;
    }
    
    const similarity = 1 / (1 + Math.sqrt(weightedDistance));

    // Calculate individual factor scores
    const factors = {
      genreAlignment: this.calculateGenreAlignment(user1.profile, user2.profile),
      instrumentCompatibility: this.calculateInstrumentCompatibility(user1.profile, user2.profile),
      tempoAlignment: this.calculateTempoAlignment(user1.profile, user2.profile),
      experienceBalance: this.calculateExperienceBalance(user1.profile, user2.profile),
      collaborationStyleMatch: this.calculateCollaborationMatch(user1.profile, user2.profile),
      audioFeaturesSimilarity: audioFeatures1 && audioFeatures2 ? 
        this.calculateAudioSimilarity(audioFeatures1, audioFeatures2) : 0.5
    };

    const details = this.generateCompatibilityDetails(factors, user1, user2);

    return {
      overall: similarity,
      factors,
      details
    };
  }

  /**
   * Predict collaboration success using ML model
   */
  predictCollaborationSuccess(
    user1: User, 
    user2: User, 
    audioFeatures1?: AudioFeatures, 
    audioFeatures2?: AudioFeatures
  ): MLModelPrediction {
    const compatibility = this.calculateMusicalCompatibility(user1, user2, audioFeatures1, audioFeatures2);
    
    // Simple neural network-like calculation for demo
    const inputs = [
      compatibility.factors.genreAlignment,
      compatibility.factors.instrumentCompatibility,
      compatibility.factors.tempoAlignment,
      compatibility.factors.experienceBalance,
      compatibility.factors.collaborationStyleMatch,
      compatibility.factors.audioFeaturesSimilarity
    ];

    // Weighted sum with activation function
    const weights = [0.2, 0.25, 0.15, 0.15, 0.15, 0.1];
    let sum = 0;
    for (let i = 0; i < inputs.length; i++) {
      sum += inputs[i] * weights[i];
    }

    const collaborationSuccess = this.sigmoid(sum);
    const musicalSynergy = compatibility.overall;
    const longTermCompatibility = (collaborationSuccess + musicalSynergy) / 2;
    
    // Calculate confidence based on feature completeness
    const confidence = this.calculatePredictionConfidence(user1, user2, audioFeatures1, audioFeatures2);

    return {
      collaborationSuccess,
      musicalSynergy,
      longTermCompatibility,
      confidence
    };
  }

  /**
   * Find similar users using clustering
   */
  findSimilarUsers(userId: string, allUsers: User[], limit: number = 10): string[] {
    const userCluster = this.userClusters.get(userId);
    if (userCluster === undefined) return [];

    const similarUsers = Array.from(this.userClusters.entries())
      .filter(([id, cluster]) => id !== userId && cluster === userCluster)
      .map(([id]) => id)
      .slice(0, limit);

    return similarUsers;
  }

  /**
   * Recommend rooms based on user clustering and preferences
   */
  recommendRoomsForUser(
    user: User, 
    rooms: CollaborationRoom[], 
    audioFeatures?: AudioFeatures
  ): CollaborationRoom[] {
    const userFeatures = this.extractUserFeatures(user, audioFeatures);
    const userCluster = this.userClusters.get(user.id);

    return rooms
      .filter(room => room.is_active)
      .map(room => ({
        room,
        score: this.calculateRoomScore(user, room, userFeatures, userCluster)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.room);
  }

private calculateGenreAlignment(profile1: UserProfile, profile2: UserProfile): number {
  const genres1 = new Set(profile1.musicalPreferences?.genres || []);
  const genres2 = new Set(profile2.musicalPreferences?.genres || []);

  // intersection stays the same
  const intersection = Array.from(genres1).filter(x => genres2.has(x)).length;

  // build the union without spread
  const unionSet = new Set<string>();
  genres1.forEach(g => unionSet.add(g));
  genres2.forEach(g => unionSet.add(g));
  const union = unionSet.size;

  return union > 0 ? intersection / union : 0;
}

  private calculateInstrumentCompatibility(profile1: UserProfile, profile2: UserProfile): number {
    const instruments1 = new Set(profile1.musicalPreferences?.instruments || []);
    const instruments2 = new Set(profile2.musicalPreferences?.instruments || []);
    
    const overlap = Array.from(instruments1).filter(x => instruments2.has(x)).length;
    const complement = Array.from(instruments2).filter(x => !instruments1.has(x)).length;
    
    // Prefer some overlap but also complementary instruments
    const overlapScore = Math.min(overlap / 3, 1) * 0.6;
    const complementScore = Math.min(complement / 2, 1) * 0.4;
    
    return overlapScore + complementScore;
  }

  private calculateTempoAlignment(profile1: UserProfile, profile2: UserProfile): number {
    const tempo1 = profile1.musicalPreferences?.preferredTempo;
    const tempo2 = profile2.musicalPreferences?.preferredTempo;
    
    if (!tempo1 || !tempo2) return 0.5;
    
    const overlap = Math.max(0, 
      Math.min(tempo1.max, tempo2.max) - Math.max(tempo1.min, tempo2.min)
    );
    const totalRange = Math.max(tempo1.max, tempo2.max) - Math.min(tempo1.min, tempo2.min);
    
    return totalRange > 0 ? overlap / totalRange : 0;
  }

  private calculateExperienceBalance(profile1: UserProfile, profile2: UserProfile): number {
    const exp1 = profile1.musicalPreferences?.experience || 'beginner';
    const exp2 = profile2.musicalPreferences?.experience || 'beginner';
    
    const expValues = { beginner: 1, intermediate: 2, advanced: 3, professional: 4 };
    const diff = Math.abs(expValues[exp1] - expValues[exp2]);
    
    // Prefer similar experience levels
    return Math.max(0, 1 - diff / 3);
  }

  private calculateCollaborationMatch(profile1: UserProfile, profile2: UserProfile): number {
    const style1 = profile1.musicalPreferences?.collaborationStyle || 'flexible';
    const style2 = profile2.musicalPreferences?.collaborationStyle || 'flexible';
    
    if (style1 === 'flexible' || style2 === 'flexible') return 0.8;
    if (style1 === style2) return style1 === 'leader' ? 0.3 : 0.9; // Two leaders might clash
    return 1.0; // Complementary styles (leader + follower)
  }

  private calculateAudioSimilarity(features1: AudioFeatures, features2: AudioFeatures): number {
    const factors = [
      1 - Math.abs(features1.energy - features2.energy),
      1 - Math.abs(features1.tempo - features2.tempo) / 100,
      1 - Math.abs(features1.harmonicComplexity - features2.harmonicComplexity),
      1 - Math.abs(features1.rhythmicComplexity - features2.rhythmicComplexity)
    ];
    
    return factors.reduce((sum, factor) => sum + Math.max(0, factor), 0) / factors.length;
  }

  private generateCompatibilityDetails(
    factors: MusicalCompatibilityScore['factors'], 
    user1: User, 
    user2: User
  ): string[] {
    const details: string[] = [];
    
    if (factors.genreAlignment > 0.7) {
      details.push('Strong genre alignment - you both love similar musical styles');
    }
    
    if (factors.instrumentCompatibility > 0.7) {
      details.push('Great instrumental compatibility - your skills complement each other well');
    }
    
    if (factors.tempoAlignment > 0.6) {
      details.push('Compatible tempo preferences - you work well at similar paces');
    }
    
    if (factors.experienceBalance > 0.8) {
      details.push('Well-matched experience levels - great for collaborative learning');
    }
    
    if (factors.collaborationStyleMatch > 0.8) {
      details.push('Complementary collaboration styles - you can create music together effectively');
    }
    
    if (details.length === 0) {
      details.push('Moderate compatibility - might work well with some compromise');
    }
    
    return details;
  }

  private calculatePredictionConfidence(
    user1: User, 
    user2: User, 
    audioFeatures1?: AudioFeatures, 
    audioFeatures2?: AudioFeatures
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on available data
    if (user1.profile.musicalPreferences?.genres?.length) confidence += 0.1;
    if (user1.profile.musicalPreferences?.instruments?.length) confidence += 0.1;
    if (user2.profile.musicalPreferences?.genres?.length) confidence += 0.1;
    if (user2.profile.musicalPreferences?.instruments?.length) confidence += 0.1;
    if (audioFeatures1) confidence += 0.1;
    if (audioFeatures2) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private calculateRoomScore(
    user: User, 
    room: CollaborationRoom, 
    userFeatures: number[], 
    userCluster?: number
  ): number {
    let score = 0.5; // Base score
    
    // Genre compatibility
    const userGenres = new Set(user.profile.musicalPreferences?.genres || []);
    if (room.settings.genre && userGenres.has(room.settings.genre)) {
      score += 0.3;
    }
    
    // Tempo compatibility
    if (room.settings.targetTempo) {
      const userTempo = user.profile.musicalPreferences?.preferredTempo;
      if (userTempo && 
          room.settings.targetTempo >= userTempo.min && 
          room.settings.targetTempo <= userTempo.max) {
        score += 0.2;
      }
    }
    
    // Room activity level
    const hoursSinceUpdate = (Date.now() - room.updated_at.getTime()) / (1000 * 60 * 60);
    if (hoursSinceUpdate < 24) score += 0.1; // Recently active
    
    return Math.min(score, 1.0);
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
}
