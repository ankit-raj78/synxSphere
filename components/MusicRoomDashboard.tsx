'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Music, Users, Clock, Share2, 
  MoreHorizontal, UserPlus, Settings, Crown, Mic2, 
  Radio, MessageCircle, Headphones, Volume2, Download,
  Upload, Eye, Activity, Sliders, FileAudio, Pause, Play
} from 'lucide-react'
import AudioMixer from './AudioMixer'
import FileUploadModal from './FileUploadModal'

interface Participant {
  _id: string
  username: string
  avatar?: string
  isOnline: boolean
  instruments: string[]
  role: 'creator' | 'participant' | 'listener'
}

interface AudioTrack {
  id: string
  name: string
  originalName: string
  uploadedBy: {
    id: string
    username: string
    avatar?: string
  }
  duration: number
  waveform: number[]
  file?: File
  audioBuffer?: AudioBuffer
  gainNode?: GainNode
  isPlaying: boolean
  isMuted: boolean
  isSolo: boolean
  isLocked: boolean
  volume: number
  pan: number
  effects: {
    reverb: number
    delay: number
    lowpass: number
    highpass: number
    distortion: number
  }
  color: string
  uploadedAt: string
}

interface MusicRoom {
  _id: string
  name: string
  description: string
  genre: string
  isLive: boolean
  participants: Participant[]
  audioTracks: AudioTrack[]
  creator: string
  createdAt: string
}

interface MusicRoomDashboardProps {
  roomId: string
  userId: string
}

export default function MusicRoomDashboard({ roomId, userId }: MusicRoomDashboardProps) {
  const [room, setRoom] = useState<MusicRoom | null>(null)
  const [tracks, setTracks] = useState<AudioTrack[]>([])
  const [activeTab, setActiveTab] = useState<'mixer' | 'chat' | 'participants'>('mixer')
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(75)
  const [currentTime, setCurrentTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  useEffect(() => {
    loadRoomData()
    loadTracks()
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

  const loadTracks = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/rooms/${roomId}/tracks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTracks(data.tracks || [])
      }
    } catch (error) {
      console.error('Error loading tracks:', error)
    }
  }

  const handleTrackUpdate = async (trackId: string, updates: Partial<AudioTrack>) => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`/api/rooms/${roomId}/tracks`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ trackId, updates })
      })

      // Update local state
      setTracks(prev => prev.map(track => 
        track.id === trackId ? { ...track, ...updates } : track
      ))
    } catch (error) {
      console.error('Error updating track:', error)
    }
  }

  const handleAddTrack = () => {
    setShowUploadModal(true)
  }

  const handleRemoveTrack = async (trackId: string) => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`/api/rooms/${roomId}/tracks?trackId=${trackId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      // Update local state
      setTracks(prev => prev.filter(track => track.id !== trackId))
    } catch (error) {
      console.error('Error removing track:', error)
    }
  }

  const handleExportMix = () => {
    // Implementation for exporting the mix
    console.log('Exporting mix...')
  }

  const handleToggleRecording = () => {
    setIsRecording(!isRecording)
  }

  const handleFileUpload = async (files: File[]) => {
    // Handle file upload logic here
    console.log('Uploading files:', files)
    // After successful upload, reload tracks
    await loadTracks()
    setShowUploadModal(false)
  }

  const togglePlayback = () => {
    setIsPlaying(!isPlaying)
    // Emit WebSocket event to sync playback with other participants
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white">Loading room...</p>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Room Not Found</h2>
          <p className="text-gray-400">The music room you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Music className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{room.name}</h1>
                <p className="text-gray-400">{room.description}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {room.genre}
                  </span>
                  <span className="flex items-center text-sm text-gray-400">
                    <Users className="w-4 h-4 mr-1" />
                    {room.participants?.length || 0} participants
                  </span>
                  {room.isLive && (
                    <span className="flex items-center text-sm text-green-400">
                      <Activity className="w-4 h-4 mr-1" />
                      Live
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite</span>
              </button>
              <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-gray-400" />
              </button>
              <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                <MoreHorizontal className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 mb-8"
        >
          <div className="flex items-center space-x-1 p-2">
            <button
              onClick={() => setActiveTab('mixer')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'mixer' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Audio Mixer</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'chat' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'participants' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Participants</span>
            </button>
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'mixer' && (
            <AudioMixer
              roomId={roomId}
              userId={userId}
              tracks={tracks}
              onTrackUpdate={handleTrackUpdate}
              onAddTrack={handleAddTrack}
              onRemoveTrack={handleRemoveTrack}
              onExportMix={handleExportMix}
              isRecording={isRecording}
              onToggleRecording={handleToggleRecording}
            />
          )}

          {activeTab === 'chat' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Room Chat</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">0 messages</span>
                </div>
              </div>
              
              <div className="h-96 bg-gray-900/50 rounded-lg p-4 mb-4 overflow-y-auto">
                <div className="text-center text-gray-400 py-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
                  Send
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'participants' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Participants</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">{room.participants?.length || 0} online</span>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center space-x-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Invite</span>
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                {room.participants?.map((participant) => (
                  <div
                    key={participant._id}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {participant.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-white">{participant.username}</p>
                          {participant.role === 'creator' && (
                            <Crown className="w-4 h-4 text-yellow-400" />
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${participant.isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
                          <span className="text-xs text-gray-400">
                            {participant.isOnline ? 'Online' : 'Offline'}
                          </span>
                          {participant.instruments.length > 0 && (
                            <span className="text-xs text-gray-400">
                              • {participant.instruments.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Headphones className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
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
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/room/${roomId}`}
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

      {/* File Upload Modal */}
      {showUploadModal && (
        <FileUploadModal
          isOpen={showUploadModal}
          onUpload={handleFileUpload}
          onClose={() => setShowUploadModal(false)}
          roomId={roomId}
          maxFiles={5}
          acceptedFormats={['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/m4a']}
        />
      )}
    </div>
  )
}
