// AI Service Integration Utilities

interface AIRecommendation {
  room_id: string
  room_name: string
  score: number
  reasoning: string
  participants: number
  genres: string[]
  metadata: any
}

interface UserPreferences {
  user_id: string
  genre_preferences: string[]
  tempo_range: [number, number]
  energy_range: [number, number]
  discovery_mode: boolean
  confidence_score: number
  last_updated: string | null
}

interface AIServiceError {
  detail: string
  status: number
}

export class AIService {
  private static baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8004'
  
  /**
   * Get room recommendations for a user from the AI service
   */
  static async getRoomRecommendations(userId: string, limit: number = 10): Promise<AIRecommendation[]> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(`${this.baseUrl}/recommendations/rooms?user_id=${userId}&limit=${limit}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const recommendations = await response.json()
        console.log(`✅ AI service returned ${recommendations.length} recommendations for user ${userId}`)
        return recommendations
      } else {
        console.log(`⚠️ AI service returned status ${response.status}`)
        return []
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('⚠️ AI service request timed out')
      } else {
        console.log('⚠️ AI service unavailable:', error)
      }
      return []
    }
  }

  /**
   * Get user preferences from the AI service
   */
  static async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      const response = await fetch(`${this.baseUrl}/recommendations/preferences/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const preferences = await response.json()
        console.log(`✅ Got user preferences for ${userId}`)
        return preferences
      } else {
        console.log(`⚠️ No preferences found for user ${userId}`)
        return null
      }
    } catch (error) {
      console.log('⚠️ Failed to get user preferences:', error)
      return null
    }
  }

  /**
   * Update user preferences in the AI service
   */
  static async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      const response = await fetch(`${this.baseUrl}/recommendations/preferences/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        console.log(`✅ Updated preferences for user ${userId}`)
        return true
      } else {
        console.log(`⚠️ Failed to update preferences for user ${userId}`)
        return false
      }
    } catch (error) {
      console.log('⚠️ Failed to update user preferences:', error)
      return false
    }
  }

  /**
   * Record user feedback for improving recommendations
   */
  static async recordFeedback(
    userId: string, 
    roomId: string, 
    feedbackType: 'like' | 'dislike' | 'join' | 'skip',
    rating?: number
  ): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      const params = new URLSearchParams({
        user_id: userId,
        room_id: roomId,
        feedback_type: feedbackType
      })
      
      if (rating !== undefined) {
        params.append('rating', rating.toString())
      }
      
      const response = await fetch(`${this.baseUrl}/recommendations/feedback?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        console.log(`✅ Recorded ${feedbackType} feedback for room ${roomId}`)
        return true
      } else {
        console.log(`⚠️ Failed to record feedback`)
        return false
      }
    } catch (error) {
      console.log('⚠️ Failed to record feedback:', error)
      return false
    }
  }

  /**
   * Check if AI service is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)
      
      const response = await fetch(`${this.baseUrl}/health/`, {
        method: 'GET',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      return false
    }
  }
}

export type { AIRecommendation, UserPreferences, AIServiceError }
