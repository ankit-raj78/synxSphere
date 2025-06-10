'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Music, Users, Clock, Play, Pause, Volume2, Share2, 
  MoreHorizontal, Heart, MessageCircle, UserPlus,
  Mic, Headphones, Radio, Settings, Crown
} from 'lucide-react'

interface Participant {
  id: string
  username: string
  avatar?: string
  isOnline: boolean
  instruments: string[]
  role: 'creator' | 'participant' | 'listener'
}

interface Track {
  id: string
  name: string
  artist: string
  duration: string
  uploadedBy: string
  waveform: number[]
  isCurrentlyPlaying?: boolean
}

interface MusicRoom {
  id: string
  name: string
  description: string
  genre: string
  isLive: boolean
  participants: Participant[]
  tracks: Track[]
  currentTrack?: Track
  playbackPosition: number
  creator: string
  createdAt: string
}

interface MusicRoomDashboardProps {
  roomId: string
  userId: string
}

export default function MusicRoomDashboard({ roomId, userId }: MusicRoomDashboardProps) {
  const [room, setRoom] = useState<MusicRoom | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(75)
  const [currentTime, setCurrentTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)

  useEffect(() => {
    loadRoomData()
    // Simulate real-time updates every 5 seconds
    const interval = setInterval(() => {
      setCurrentTime(prev => prev + 1)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [roomId])

  const loadRoomData = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/rooms/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const roomData = await response.json()
        setRoom(roomData)
      }
    } catch (error) {
      console.error('Error loading room data:', error)
    } finally {
      setLoading(false)
    }
  }

  const togglePlayback = () => {
    setIsPlaying(!isPlaying)
    // Emit WebSocket event to sync playback with other participants
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Room not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {room.name}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {room.participants.length} participants
                  </span>
                  <span className="flex items-center">
                    <Music className="w-4 h-4 mr-1" />
                    {room.genre}
                  </span>
                  {room.isLive && (
                    <span className="flex items-center text-red-400">
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse mr-2" />
                      LIVE
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite</span>
              </button>
              <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Track */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Now Playing</h2>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-400">Synced</span>
                </div>
              </div>

              {room.currentTrack ? (
                <div>
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                      <Music className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{room.currentTrack.name}</h3>
                      <p className="text-gray-400">{room.currentTrack.artist}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                        <Heart className="w-5 h-5" />
                      </button>
                      <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Waveform Visualization */}
                  <div className="mb-4">
                    <div className="h-16 bg-gray-900 rounded-lg flex items-end justify-center space-x-1 p-2">
                      {room.currentTrack.waveform?.map((height, index) => (
                        <div
                          key={index}
                          className={`w-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-sm transition-all ${
                            index < (currentTime / 180) * room.currentTrack!.waveform.length ? 'opacity-100' : 'opacity-30'
                          }`}
                          style={{ height: `${height * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={togglePlayback}
                        className="w-12 h-12 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center transition-colors"
                      >
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                      </button>
                      <div className="flex items-center space-x-2">
                        <Volume2 className="w-5 h-5 text-gray-400" />
                        <div className="w-24 h-2 bg-gray-700 rounded-full">
                          <div 
                            className="h-full bg-purple-500 rounded-full transition-all"
                            style={{ width: `${volume}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatTime(currentTime)} / {room.currentTrack.duration}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No track currently playing</p>
                </div>
              )}
            </motion.div>

            {/* Playlist */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Playlist</h2>
                <span className="text-sm text-gray-400">{room.tracks.length} tracks</span>
              </div>

              <div className="space-y-3">
                {room.tracks.map((track, index) => (
                  <div 
                    key={track.id}
                    className={`flex items-center space-x-4 p-3 rounded-lg transition-colors ${
                      track.isCurrentlyPlaying ? 'bg-purple-600/20 border border-purple-500/30' : 'hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-400">
                      {track.isCurrentlyPlaying ? (
                        <div className="flex space-x-1">
                          <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse" />
                          <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                          <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </div>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{track.name}</h4>
                      <p className="text-sm text-gray-400">{track.artist}</p>
                    </div>
                    <div className="text-sm text-gray-400">{track.duration}</div>
                    <button className="p-2 hover:bg-gray-600 rounded-lg transition-colors">
                      <Play className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Participants */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6"
            >
              <h2 className="text-xl font-bold mb-4">Participants</h2>
              <div className="space-y-3">
                {room.participants.map((participant) => (
                  <div key={participant.id} className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold">
                          {participant.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {participant.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-800" />
                      )}
                      {participant.role === 'creator' && (
                        <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{participant.username}</p>
                      <p className="text-xs text-gray-400">
                        {participant.instruments.join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {participant.role === 'creator' && <Mic className="w-4 h-4 text-purple-400" />}
                      <Headphones className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Room Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6"
            >
              <h2 className="text-xl font-bold mb-4">Room Stats</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Tracks</span>
                  <span className="font-bold">{room.tracks.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Session Time</span>
                  <span className="font-bold">2h 34m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Created</span>
                  <span className="font-bold">
                    {new Date(room.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6"
            >
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button className="w-full flex items-center space-x-3 p-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
                  <Music className="w-5 h-5" />
                  <span>Add Track</span>
                </button>
                <button className="w-full flex items-center space-x-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                  <Radio className="w-5 h-5" />
                  <span>Start Broadcast</span>
                </button>
                <button className="w-full flex items-center space-x-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  <span>Open Chat</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-xl font-bold mb-4">Invite to Room</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Share Link</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/room/${roomId}`}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                  />
                  <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition-colors">
                    Copy
                  </button>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
