import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import DatabaseManager from '../../../shared/config/database';
import { User, MusicalPreferences } from '../../../shared/types';
import { createError } from '../middleware/errorHandler';
import { createLogger } from '../utils/logger';

const logger = createLogger('ProfileController');

class ProfileController {
  /**
   * Get current user's profile
   */
  async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await DatabaseManager.executeQuery<User>(
        'SELECT id, email, username, profile, created_at, updated_at FROM users WHERE id = $1',
        [req.user.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ profile: result.rows[0] });

    } catch (error) {
      logger.error('Get my profile error:', error);
      next(createError('Failed to fetch profile', 500));
    }
  }

  /**
   * Update current user's profile
   */
  async updateMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { bio, avatar, musicalPreferences } = req.body;

      // Get current profile
      const currentUser = await DatabaseManager.executeQuery<User>(
        'SELECT profile FROM users WHERE id = $1',
        [req.user.id]
      );

      if (currentUser.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const currentProfile = currentUser.rows[0].profile;

      // Update profile
      const updatedProfile = {
        ...currentProfile,
        ...(bio !== undefined && { bio }),
        ...(avatar !== undefined && { avatar }),
        ...(musicalPreferences && {
          musicalPreferences: {
            ...currentProfile.musicalPreferences,
            ...musicalPreferences
          }
        })
      };

      const result = await DatabaseManager.executeQuery<User>(
        `UPDATE users 
         SET profile = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, email, username, profile, created_at, updated_at`,
        [JSON.stringify(updatedProfile), req.user.id]
      );

      logger.info('Profile updated', { userId: req.user.id });

      res.json({
        message: 'Profile updated successfully',
        profile: result.rows[0]
      });

    } catch (error) {
      logger.error('Update profile error:', error);
      next(createError('Failed to update profile', 500));
    }
  }

  /**
   * Update musical preferences specifically
   */
  async updateMusicalPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const preferences = req.body;

      // Validate preferred tempo range
      if (preferences.preferredTempo && 
          preferences.preferredTempo.min >= preferences.preferredTempo.max) {
        res.status(400).json({ error: 'Preferred tempo minimum must be less than maximum' });
        return;
      }

      // Get current profile
      const currentUser = await DatabaseManager.executeQuery<User>(
        'SELECT profile FROM users WHERE id = $1',
        [req.user.id]
      );

      if (currentUser.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const currentProfile = currentUser.rows[0].profile;

      // Update musical preferences
      const updatedProfile = {
        ...currentProfile,
        musicalPreferences: {
          ...currentProfile.musicalPreferences,
          ...preferences
        }
      };

      const result = await DatabaseManager.executeQuery<User>(
        `UPDATE users 
         SET profile = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, email, username, profile, created_at, updated_at`,
        [JSON.stringify(updatedProfile), req.user.id]
      );

      logger.info('Musical preferences updated', { userId: req.user.id });

      res.json({
        message: 'Musical preferences updated successfully',
        musicalPreferences: result.rows[0].profile.musicalPreferences
      });

    } catch (error) {
      logger.error('Update musical preferences error:', error);
      next(createError('Failed to update musical preferences', 500));
    }
  }

  /**
   * Calculate compatibility with another user
   */
  async getCompatibility(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { userId } = req.params;

      if (userId === req.user.id) {
        res.status(400).json({ error: 'Cannot calculate compatibility with yourself' });
        return;
      }

      // Get both users' profiles
      const result = await DatabaseManager.executeQuery<User>(
        'SELECT id, username, profile FROM users WHERE id IN ($1, $2)',
        [req.user.id, userId]
      );

      if (result.rows.length !== 2) {
        res.status(404).json({ error: 'One or both users not found' });
        return;
      }

      const currentUser = result.rows.find(u => u.id === req.user!.id);
      const otherUser = result.rows.find(u => u.id === userId);

      if (!currentUser || !otherUser) {
        res.status(404).json({ error: 'User data inconsistency' });
        return;
      }

      // Ensure both users have musical preferences
      if (!currentUser.profile?.musicalPreferences || !otherUser.profile?.musicalPreferences) {
        res.status(400).json({ error: 'Both users must have musical preferences set for compatibility calculation' });
        return;
      }

      const compatibility = this.calculateCompatibility(
        currentUser.profile.musicalPreferences,
        otherUser.profile.musicalPreferences
      );

      logger.info('Compatibility calculated', { 
        user1: req.user.id, 
        user2: userId, 
        score: compatibility.overallScore 
      });

      res.json({
        compatibility: {
          ...compatibility,
          users: {
            you: {
              id: currentUser.id,
              username: currentUser.username
            },
            other: {
              id: otherUser.id,
              username: otherUser.username
            }
          }
        }
      });

    } catch (error) {
      logger.error('Get compatibility error:', error);
      next(createError('Failed to calculate compatibility', 500));
    }
  }

  /**
   * Calculate compatibility score between two musical preferences
   */
  private calculateCompatibility(prefs1: MusicalPreferences, prefs2: MusicalPreferences) {
    let totalScore = 0;
    let maxScore = 0;

    // Genre compatibility (weight: 30%)
    const genreWeight = 0.3;
    const genreScore = this.calculateArraySimilarity(prefs1.genres, prefs2.genres);
    totalScore += genreScore * genreWeight;
    maxScore += genreWeight;

    // Instrument compatibility (weight: 25%)
    const instrumentWeight = 0.25;
    const instrumentScore = this.calculateArraySimilarity(prefs1.instruments, prefs2.instruments);
    totalScore += instrumentScore * instrumentWeight;
    maxScore += instrumentWeight;

    // Experience compatibility (weight: 15%)
    const experienceWeight = 0.15;
    const experienceScore = this.calculateExperienceCompatibility(prefs1.experience, prefs2.experience);
    totalScore += experienceScore * experienceWeight;
    maxScore += experienceWeight;

    // Collaboration style compatibility (weight: 20%)
    const collaborationWeight = 0.2;
    const collaborationScore = this.calculateCollaborationCompatibility(
      prefs1.collaborationStyle, 
      prefs2.collaborationStyle
    );
    totalScore += collaborationScore * collaborationWeight;
    maxScore += collaborationWeight;

    // Tempo compatibility (weight: 10%)
    const tempoWeight = 0.1;
    const tempoScore = this.calculateTempoCompatibility(prefs1.preferredTempo, prefs2.preferredTempo);
    totalScore += tempoScore * tempoWeight;
    maxScore += tempoWeight;

    const overallScore = Math.round((totalScore / maxScore) * 100);

    return {
      overallScore,
      breakdown: {
        genres: Math.round(genreScore * 100),
        instruments: Math.round(instrumentScore * 100),
        experience: Math.round(experienceScore * 100),
        collaborationStyle: Math.round(collaborationScore * 100),
        tempo: Math.round(tempoScore * 100)
      },
      recommendation: this.getCompatibilityRecommendation(overallScore)
    };
  }

  private calculateArraySimilarity(arr1: string[], arr2: string[]): number {
    if (!arr1.length || !arr2.length) return 0;
    
    const intersection = arr1.filter(item => arr2.includes(item));
    const union = [...new Set([...arr1, ...arr2])];
    
    return intersection.length / union.length;
  }

  private calculateExperienceCompatibility(exp1: string, exp2: string): number {
    const levels = ['beginner', 'intermediate', 'advanced', 'professional'];
    const level1 = levels.indexOf(exp1);
    const level2 = levels.indexOf(exp2);
    
    if (level1 === -1 || level2 === -1) return 0;
    
    const difference = Math.abs(level1 - level2);
    return Math.max(0, 1 - (difference / 3));
  }

  private calculateCollaborationCompatibility(style1: string, style2: string): number {
    if (style1 === 'flexible' || style2 === 'flexible') return 1;
    if (style1 === 'leader' && style2 === 'follower') return 1;
    if (style1 === 'follower' && style2 === 'leader') return 1;
    if (style1 === style2) return 0.7;
    return 0.3;
  }

  private calculateTempoCompatibility(tempo1: { min: number; max: number }, tempo2: { min: number; max: number }): number {
    const overlap = Math.max(0, Math.min(tempo1.max, tempo2.max) - Math.max(tempo1.min, tempo2.min));
    const range1 = tempo1.max - tempo1.min;
    const range2 = tempo2.max - tempo2.min;
    const averageRange = (range1 + range2) / 2;
    
    return overlap / averageRange;
  }

  private getCompatibilityRecommendation(score: number): string {
    if (score >= 80) return 'Excellent match! You should definitely collaborate.';
    if (score >= 60) return 'Good compatibility. Worth exploring collaboration.';
    if (score >= 40) return 'Moderate compatibility. Could work with some compromise.';
    if (score >= 20) return 'Low compatibility. Collaboration might be challenging.';
    return 'Very low compatibility. Consider different collaborators.';
  }
}

export default new ProfileController();
