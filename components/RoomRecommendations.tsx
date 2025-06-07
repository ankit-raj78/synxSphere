'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Music, Clock, Star, ArrowRight, Zap, Heart, Target, Plus } from 'lucide-react'

interface Room {
  _id: string
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
  currentTracks: any[]
  createdAt: string
}

interface RoomRecommendation {
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

interface RoomRecommendationsProps {
  userId: string
}

export default function RoomRecommendations({ userId }: RoomRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RoomRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)

  useEffect(() => {
    loadRecommendations()
  }, [userId])

  const loadRecommendations = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // For now, use mock data while the recommendation engine is being built
      const mockRecommendations: RoomRecommendation[] = [
        {
          room: {
            _id: '1',
            name: 'Electronic Fusion Lab',
            description: 'Experimental electronic music collaboration',
            creator: 'SynthMaster',
            participants: ['SynthMaster', 'BeatMaker'],
            maxParticipants: 6,
            isActive: true,
            musicalRequirements: {
              instruments: ['Synthesizer', 'Drum Machine'],
              genres: ['Electronic', 'Ambient'],
              experienceLevel: ['intermediate', 'advanced'],
              tempoRange: [100, 140],
              keyPreferences: ['Am', 'Dm']
            },
            currentTracks: [],
            createdAt: new Date().toISOString()
          },
          compatibilityScore: 0.92,
          compatibilityFactors: {
            musicalStyle: 0.95,
            instrumentMatch: 0.88,
            genreMatch: 0.94,
            tempoCompatibility: 0.91,
            experienceLevel: 0.89
          },
          explanation: [
            'Perfect match for electronic music enthusiasts',
            'Your synthesizer skills are highly valued',
            'Similar tempo preferences (120-140 BPM)',
            'Collaborative experimental approach'
          ]
        },
        {
          room: {
            _id: '2',
            name: 'Indie Rock Sessions',
            description: 'Creating authentic indie rock vibes',
            creator: 'GuitarHero',
            participants: ['GuitarHero', 'DrummerBoy', 'BassLine'],
            maxParticipants: 5,
            isActive: true,
            musicalRequirements: {
              instruments: ['Guitar', 'Bass', 'Drums'],
              genres: ['Rock', 'Indie', 'Alternative'],
              experienceLevel: ['intermediate'],
              tempoRange: [80, 130],
              keyPreferences: ['G', 'D', 'A']
            },
            currentTracks: [],
            createdAt: new Date().toISOString()
          },
          compatibilityScore: 0.76,
          compatibilityFactors: {
            musicalStyle: 0.78,
            instrumentMatch: 0.82,
            genreMatch: 0.71,
            tempoCompatibility: 0.85,
            experienceLevel: 0.84
          },
          explanation: [
            'Good match for rock collaboration',
            'Your guitar skills complement the band',
            'Similar energy and style preferences',
            'Active collaboration happening now'
          ]
        },
        {
          room: {
            _id: '3',
            name: 'Jazz Improvisation Circle',
            description: 'Spontaneous jazz creation and exploration',
            creator: 'JazzCat',
            participants: ['JazzCat', 'PianoWiz'],
            maxParticipants: 8,
            isActive: true,
            musicalRequirements: {
              instruments: ['Piano', 'Saxophone', 'Bass', 'Drums'],
              genres: ['Jazz', 'Blues', 'Fusion'],
              experienceLevel: ['advanced'],
              tempoRange: [60, 180],
              keyPreferences: ['Bb', 'F', 'C']
            },
            currentTracks: [],
            createdAt: new Date().toISOString()
          },
          compatibilityScore: 0.68,
          compatibilityFactors: {
            musicalStyle: 0.72,
            instrumentMatch: 0.65,
            genreMatch: 0.69,
            tempoCompatibility: 0.71,
            experienceLevel: 0.63
          },
          explanation: [
            'Challenging but rewarding collaboration',
            'Opportunity to expand your musical horizons',
            'Learn from experienced jazz musicians',
            'Flexible tempo and improvisation focus'
          ]
        }
      ]

      setRecommendations(mockRecommendations)
    } catch (error) {
      console.error('Error loading recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const joinRoom = async (roomId: string) => {
    setJoining(roomId)
    try {
      // For now, directly navigate to the room
      // In a real app, this would make an API call to join the room first
      window.location.href = `/room/${roomId}`
    } catch (error) {
      console.error('Error joining room:', error)
    } finally {
      setJoining(null)
    }
  }

  const getCompatibilityColor = (score: number) => {
    if (score >= 0.8) return 'from-green-500 to-emerald-500'
    if (score >= 0.6) return 'from-blue-500 to-cyan-500'
    if (score >= 0.4) return 'from-yellow-500 to-orange-500'
    return 'from-red-500 to-pink-500'
  }

  const getCompatibilityLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent Match'
    if (score >= 0.6) return 'Good Match'
    if (score >= 0.4) return 'Fair Match'
    return 'Low Match'
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <div className="music-wave h-6 w-1"></div>
            <div className="music-wave h-8 w-1"></div>
            <div className="music-wave h-6 w-1"></div>
            <span className="text-lg ml-4">Finding your perfect collaborators...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">AI-Recommended Rooms</h2>
            <p className="text-gray-400">
              Discover collaboration rooms perfectly matched to your musical style
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span>Powered by AI</span>
          </div>
        </div>

        {recommendations.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Recommendations Yet</h3>
            <p className="text-gray-400 mb-6">
              Upload some music to help our AI find your perfect collaborators
            </p>
            <button className="btn-primary">
              Upload Music First
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recommendations.map((rec, index) => (
              <motion.div
                key={rec.room._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gray-700 rounded-xl p-6 border border-gray-600 hover:border-primary-500 transition-all duration-300"
              >
                {/* Compatibility Score */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`px-3 py-1 bg-gradient-to-r ${getCompatibilityColor(rec.compatibilityScore)} rounded-full text-white text-sm font-medium`}>
                    {Math.round(rec.compatibilityScore * 100)}% {getCompatibilityLabel(rec.compatibilityScore)}
                  </div>
                  <div className="flex items-center space-x-1 text-gray-400">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">
                      {rec.room.participants.length}/{rec.room.maxParticipants}
                    </span>
                  </div>
                </div>

                {/* Room Info */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold mb-2">{rec.room.name}</h3>
                  <p className="text-gray-300 text-sm mb-3">{rec.room.description}</p>
                  
                  {/* Musical Requirements */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {rec.room.musicalRequirements.genres.slice(0, 3).map((genre) => (
                      <span key={genre} className="px-2 py-1 bg-secondary-500/20 text-secondary-300 text-xs rounded">
                        {genre}
                      </span>
                    ))}
                    {rec.room.musicalRequirements.instruments.slice(0, 2).map((instrument) => (
                      <span key={instrument} className="px-2 py-1 bg-primary-500/20 text-primary-300 text-xs rounded">
                        {instrument}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Compatibility Factors */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2 text-gray-300">Why this is a great match:</h4>
                  <div className="space-y-1">
                    {rec.explanation.slice(0, 2).map((reason, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-sm text-gray-400">
                        <Star className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compatibility Bars */}
                <div className="mb-4 space-y-2">
                  {Object.entries(rec.compatibilityFactors).slice(0, 3).map(([factor, score]) => (
                    <div key={factor} className="flex items-center space-x-2 text-xs">
                      <span className="w-20 text-gray-400 capitalize">
                        {factor.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <div className="flex-1 h-1.5 bg-gray-600 rounded-full">
                        <div
                          className={`h-1.5 bg-gradient-to-r ${getCompatibilityColor(score)} rounded-full transition-all duration-500`}
                          style={{ width: `${score * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-400">{Math.round(score * 100)}%</span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => joinRoom(rec.room._id!)}
                  disabled={joining === rec.room._id}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  {joining === rec.room._id ? (
                    <>
                      <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Joining...</span>
                    </>
                  ) : (
                    <>
                      <span>Join Collaboration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Option */}
      <div className="card bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border border-primary-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Can't find the perfect room?</h3>
            <p className="text-gray-400">
              Create your own collaboration room and let others find you
            </p>
          </div>
          <button className="btn-secondary flex items-center space-x-2">
            <Target className="w-4 h-4" />
            <span>Create Room</span>
          </button>
        </div>
      </div>
    </div>
  )
}
