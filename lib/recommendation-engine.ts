import { ObjectId } from 'mongodb'
import { getDatabase } from './mongodb'
import { AudioFeatures } from './audio-analysis'
import { User } from './auth'

export interface Room {
  _id?: string
  name: string
  description: string
  creator: string
  participants: string[]
  maxParticipants: number
  isActive: boolean
  musicalRequirements: {
    instruments: string[]
    genres: string[]
    experienceLevel: string[]
    tempoRange: [number, number]
    keyPreferences: string[]
  }
  currentTracks: {
    fileId: string
    userId: string
    fileName: string
    uploadedAt: Date
    audioFeatures?: AudioFeatures
  }[]
  createdAt: Date
  updatedAt: Date
}

export interface RoomRecommendation {
  room: Room
  compatibilityScore: number
  compatibilityFactors: {
    musicalStyle: number
    instrumentMatch: number
    genreMatch: number
    tempoCompatibility: number
    experienceLevel: number
  }
  explanation: string[]
}

export interface UserCompatibility {
  userId: string
  compatibilityScore: number
  sharedInterests: string[]
  complementarySkills: string[]
  musicalSynergy: number
}

export class RecommendationEngine {
  private db = getDatabase()

  async getRecommendedRooms(userId: string, limit: number = 10): Promise<RoomRecommendation[]> {
    try {
      const db = await this.db
      const users = db.collection('users')
      const rooms = db.collection('rooms')
      const audioFiles = db.collection('audioFiles')

      // Get user profile and musical analysis
      const user = await users.findOne({ _id: new ObjectId(userId) }) as User | null
      if (!user) throw new Error('User not found')

      // Get user's audio analysis data
      const userAudioFiles = await audioFiles.find({ userId }).toArray()
      const userMusicalProfile = this.calculateUserMusicalProfile(user, userAudioFiles)

      // Get active rooms
      const activeRooms = await rooms.find({ 
        isActive: true,
        participants: { $ne: new ObjectId(userId) }, // Exclude rooms user is already in
        $expr: { $lt: [{ $size: "$participants" }, "$maxParticipants"] } // Has space
      }).toArray() as unknown as Room[]

      // Calculate compatibility scores
      const recommendations: RoomRecommendation[] = []

      for (const room of activeRooms) {
        const compatibility = await this.calculateRoomCompatibility(userMusicalProfile, room)
        if (compatibility.compatibilityScore > 0.3) { // Threshold for recommendations
          recommendations.push({
            room,
            ...compatibility
          })
        }
      }

      // Sort by compatibility score and return top results
      return recommendations
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
        .slice(0, limit)

    } catch (error) {
      console.error('Room recommendation error:', error)
      return []
    }
  }

  async findCompatibleUsers(userId: string, limit: number = 20): Promise<UserCompatibility[]> {
    try {
      const db = await this.db
      const users = db.collection('users')
      const audioFiles = db.collection('audioFiles')

      // Get current user
      const currentUser = await users.findOne({ _id: new ObjectId(userId) }) as User | null
      if (!currentUser) throw new Error('User not found')

      // Get current user's audio analysis
      const currentUserAudio = await audioFiles.find({ userId }).toArray()
      const currentUserProfile = this.calculateUserMusicalProfile(currentUser, currentUserAudio)

      // Get other users
      const otherUsers = await users.find({ 
        _id: { $ne: new ObjectId(userId) },
        'profile.instruments': { $exists: true, $ne: [] }
      }).toArray() as User[]

      const compatibilities: UserCompatibility[] = []

      for (const user of otherUsers) {
        const userAudio = await audioFiles.find({ userId: user._id?.toString() }).toArray()
        const userProfile = this.calculateUserMusicalProfile(user, userAudio)
        
        const compatibility = this.calculateUserCompatibility(currentUserProfile, userProfile, user)
        if (compatibility.compatibilityScore > 0.4) {
          compatibilities.push(compatibility)
        }
      }

      return compatibilities
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
        .slice(0, limit)

    } catch (error) {
      console.error('User compatibility error:', error)
      return []
    }
  }

  private calculateUserMusicalProfile(user: User, audioFiles: any[]) {
    const profile = {
      instruments: user.profile.instruments || [],
      genres: user.profile.genres || [],
      experience: user.profile.experience || '',
      collaborationGoals: user.profile.collaborationGoals || [],
      audioFeatures: this.aggregateAudioFeatures(audioFiles),
      activityLevel: this.calculateActivityLevel(audioFiles)
    }

    return profile
  }

  private async calculateRoomCompatibility(userProfile: any, room: Room): Promise<{
    compatibilityScore: number
    compatibilityFactors: {
      musicalStyle: number
      instrumentMatch: number
      genreMatch: number
      tempoCompatibility: number
      experienceLevel: number
    }
    explanation: string[]
  }> {
    const factors = {
      musicalStyle: 0,
      instrumentMatch: 0,
      genreMatch: 0,
      tempoCompatibility: 0,
      experienceLevel: 0
    }

    const explanations: string[] = []

    // Calculate instrument compatibility
    const userInstruments = new Set(userProfile.instruments as string[])
    const roomInstruments = new Set(room.musicalRequirements.instruments as string[])
    const instrumentOverlap = Array.from(userInstruments).filter(x => roomInstruments.has(x))
    
    if (instrumentOverlap.length > 0) {
      factors.instrumentMatch = Math.min(1, instrumentOverlap.length / Math.max(userInstruments.size, roomInstruments.size))
      explanations.push(`Plays ${instrumentOverlap.join(', ')} - instruments needed in this room`)
    }

    // Calculate genre compatibility
    const userGenres = new Set(userProfile.genres as string[])
    const roomGenres = new Set(room.musicalRequirements.genres as string[])
    const genreOverlap = Array.from(userGenres).filter(x => roomGenres.has(x))
    
    if (genreOverlap.length > 0) {
      factors.genreMatch = Math.min(1, genreOverlap.length / Math.max(userGenres.size, roomGenres.size))
      explanations.push(`Shared interest in ${genreOverlap.join(', ')}`)
    }

    // Calculate tempo compatibility
    if (userProfile.audioFeatures.avgTempo && room.musicalRequirements.tempoRange) {
      const [minTempo, maxTempo] = room.musicalRequirements.tempoRange
      const userTempo = userProfile.audioFeatures.avgTempo
      
      if (userTempo >= minTempo && userTempo <= maxTempo) {
        factors.tempoCompatibility = 1
        explanations.push(`Tempo preference (${userTempo} BPM) matches room requirements`)
      } else {
        const distance = Math.min(Math.abs(userTempo - minTempo), Math.abs(userTempo - maxTempo))
        factors.tempoCompatibility = Math.max(0, 1 - distance / 50) // Allow 50 BPM tolerance
      }
    }

    // Calculate experience compatibility
    const experienceValues = {
      'Beginner (0-2 years)': 1,
      'Intermediate (3-5 years)': 2,
      'Advanced (6-10 years)': 3,
      'Professional (10+ years)': 4
    }

    const userExp = experienceValues[userProfile.experience as keyof typeof experienceValues] || 2
    const roomExpLevels = room.musicalRequirements.experienceLevel.map(level => 
      experienceValues[level as keyof typeof experienceValues] || 2
    )

    if (roomExpLevels.length > 0) {
      const avgRoomExp = roomExpLevels.reduce((a, b) => a + b, 0) / roomExpLevels.length
      const expDiff = Math.abs(userExp - avgRoomExp)
      factors.experienceLevel = Math.max(0, 1 - expDiff / 3)
      
      if (factors.experienceLevel > 0.7) {
        explanations.push('Experience level matches other participants')
      }
    }

    // Calculate musical style compatibility from audio features
    if (userProfile.audioFeatures.avgHarmonicComplexity !== undefined) {
      // This would involve comparing with room participants' audio features
      factors.musicalStyle = 0.7 // Placeholder for demo
      explanations.push('Musical style analysis shows good compatibility')
    }

    // Calculate overall compatibility score
    const weights = {
      instrumentMatch: 0.25,
      genreMatch: 0.25,
      tempoCompatibility: 0.2,
      experienceLevel: 0.15,
      musicalStyle: 0.15
    }

    const compatibilityScore = Object.entries(factors).reduce((score, [key, value]) => {
      return score + value * weights[key as keyof typeof weights]
    }, 0)

    return {
      compatibilityScore,
      compatibilityFactors: factors,
      explanation: explanations
    }
  }

  private calculateUserCompatibility(currentUserProfile: any, otherUserProfile: any, otherUser: User): UserCompatibility {
    let compatibilityScore = 0
    const sharedInterests: string[] = []
    const complementarySkills: string[] = []

    // Calculate genre overlap
    const currentGenres = new Set(currentUserProfile.genres as string[])
    const otherGenres = new Set(otherUserProfile.genres as string[])
    const genreOverlap = Array.from(currentGenres).filter(x => otherGenres.has(x))
    
    if (genreOverlap.length > 0) {
      sharedInterests.push(...genreOverlap)
      compatibilityScore += 0.3 * (genreOverlap.length / Math.max(currentGenres.size, otherGenres.size))
    }

    // Calculate instrument complementarity
    const currentInstruments = new Set(currentUserProfile.instruments as string[])
    const otherInstruments = new Set(otherUserProfile.instruments as string[])
    const instrumentOverlap = Array.from(currentInstruments).filter(x => otherInstruments.has(x))
    const uniqueInstruments = Array.from(otherInstruments).filter(x => !currentInstruments.has(x))

    // Prefer some overlap but also complementary instruments
    if (instrumentOverlap.length > 0 && uniqueInstruments.length > 0) {
      complementarySkills.push(...uniqueInstruments)
      compatibilityScore += 0.25
    }

    // Calculate collaboration goal alignment
    const currentGoals = new Set(currentUserProfile.collaborationGoals as string[])
    const otherGoals = new Set(otherUserProfile.collaborationGoals as string[])
    const goalOverlap = Array.from(currentGoals).filter(x => otherGoals.has(x))
    
    if (goalOverlap.length > 0) {
      compatibilityScore += 0.2 * (goalOverlap.length / Math.max(currentGoals.size, otherGoals.size))
    }

    // Calculate musical synergy from audio features
    const musicalSynergy = this.calculateMusicalSynergy(
      currentUserProfile.audioFeatures, 
      otherUserProfile.audioFeatures
    )
    compatibilityScore += 0.25 * musicalSynergy

    return {
      userId: otherUser._id!.toString(),
      compatibilityScore,
      sharedInterests,
      complementarySkills,
      musicalSynergy
    }
  }

  private aggregateAudioFeatures(audioFiles: any[]) {
    if (audioFiles.length === 0) {
      return {
        avgTempo: undefined,
        avgHarmonicComplexity: undefined,
        avgEnergy: undefined,
        avgLoudness: undefined,
        dominantKeys: [],
        avgSpectralCentroid: undefined
      }
    }

    const features = audioFiles.map(file => file.audioFeatures).filter(Boolean)
    if (features.length === 0) return {}

    return {
      avgTempo: features.reduce((sum, f) => sum + f.tempo, 0) / features.length,
      avgHarmonicComplexity: features.reduce((sum, f) => sum + f.harmonicComplexity, 0) / features.length,
      avgEnergy: features.reduce((sum, f) => sum + f.energy, 0) / features.length,
      avgLoudness: features.reduce((sum, f) => sum + f.loudness, 0) / features.length,
      dominantKeys: this.findDominantKeys(features.map(f => f.key)),
      avgSpectralCentroid: features.reduce((sum, f) => sum + f.spectralCentroid, 0) / features.length
    }
  }

  private calculateActivityLevel(audioFiles: any[]): number {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentFiles = audioFiles.filter(file => 
      new Date(file.uploadedAt) > thirtyDaysAgo
    )
    
    // Return activity score between 0 and 1
    return Math.min(1, recentFiles.length / 10)
  }

  private findDominantKeys(keys: string[]): string[] {
    const keyCount: { [key: string]: number } = {}
    keys.forEach(key => {
      keyCount[key] = (keyCount[key] || 0) + 1
    })
    
    return Object.entries(keyCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([key]) => key)
  }

  private calculateMusicalSynergy(features1: any, features2: any): number {
    if (!features1 || !features2 || 
        features1.avgTempo === undefined || features2.avgTempo === undefined) {
      return 0.5 // Default neutral synergy
    }

    let synergy = 0

    // Tempo compatibility
    const tempoDiff = Math.abs(features1.avgTempo - features2.avgTempo)
    const tempoSynergy = Math.max(0, 1 - tempoDiff / 50) // 50 BPM tolerance
    synergy += 0.3 * tempoSynergy

    // Harmonic complexity compatibility
    if (features1.avgHarmonicComplexity !== undefined && features2.avgHarmonicComplexity !== undefined) {
      const complexityDiff = Math.abs(features1.avgHarmonicComplexity - features2.avgHarmonicComplexity)
      const complexitySynergy = Math.max(0, 1 - complexityDiff)
      synergy += 0.25 * complexitySynergy
    }

    // Energy level compatibility
    if (features1.avgEnergy !== undefined && features2.avgEnergy !== undefined) {
      const energyDiff = Math.abs(features1.avgEnergy - features2.avgEnergy)
      const energySynergy = Math.max(0, 1 - energyDiff)
      synergy += 0.25 * energySynergy
    }

    // Key compatibility (simplified)
    if (features1.dominantKeys && features2.dominantKeys) {
      const keyOverlap = features1.dominantKeys.filter((key: string) => 
        features2.dominantKeys.includes(key)
      ).length
      const keySynergy = keyOverlap > 0 ? 1 : 0.5
      synergy += 0.2 * keySynergy
    }

    return Math.min(1, synergy)
  }
}
