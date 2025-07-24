'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  Music, Users, Clock, Share2, 
  MoreHorizontal, UserPlus, Settings, Crown, Mic2, 
  Radio, MessageCircle, Headphones, Volume2, Download,
  Upload, Eye, Activity, Sliders, FileAudio, Pause, Play, Check, X, Bell
} from 'lucide-react'
import AudioMixer from './AudioMixer'
import FileUploadModal from './FileUploadModal'
import RoomFileUpload from './RoomFileUpload'
import AudioPlayer from './AudioPlayer'

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
  audioFileId?: string // Add audioFileId field
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
  const router = useRouter()
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
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [participantActivity, setParticipantActivity] = useState<{[key: string]: Date}>({})
  const [newParticipants, setNewParticipants] = useState<string[]>([])
  const [joinRequests, setJoinRequests] = useState<any[]>([])
  const [showJoinRequests, setShowJoinRequests] = useState(false)
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)
  const [selectedTracks, setSelectedTracks] = useState<string[]>([])
  const [isComposing, setIsComposing] = useState(false)
  const [compositions, setCompositions] = useState<any[]>([])
  const [showComposeModal, setShowComposeModal] = useState(false)

  useEffect(() => {
    loadRoomData()
    loadTracks()
    loadJoinRequests()
    loadCompositions()
    
    // Real-time updates - poll for room changes every 5 seconds
    const roomUpdateInterval = setInterval(() => {
      loadRoomData()
      loadJoinRequests() // Check for new join requests
    }, 5000)
    
    // Time tracking
    const timeInterval = setInterval(() => {
      setCurrentTime(prev => prev + 1)
    }, 1000)
    
    return () => {
      clearInterval(roomUpdateInterval)
      clearInterval(timeInterval)
    }
  }, [roomId])

  useEffect(() => {
    if (room?.participants) {
      const currentParticipantIds = room.participants.map(p => p._id)
      
      // Update participant activity
      setParticipantActivity(prev => {
        const newActivity: {[key: string]: Date} = {}
        room.participants.forEach(p => {
          newActivity[p._id] = new Date()
        })
        
        // Check for new participants
        const newlyJoined = currentParticipantIds.filter(id => !prev[id])
        if (newlyJoined.length > 0) {
          setNewParticipants(newlyJoined)
          // Clear the "new" indicator after 5 seconds
          setTimeout(() => {
            setNewParticipants([])
          }, 5000)
        }
        
        return newActivity
      })
    }
  }, [room?.participants])

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
        setLastUpdate(new Date())
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
        // Only show actual uploaded tracks, not mock data
        const realTracks = data.tracks?.filter((track: any) => track.filePath && !track.filePath.includes('mock')) || []
        setTracks(realTracks)
      }
    } catch (error) {
      console.error('Error loading tracks:', error)
      setTracks([]) // Set empty array instead of showing mock tracks
    }
  }

  const loadJoinRequests = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setJoinRequests(data.requests || [])
      }
    } catch (error) {
      console.error('Error loading join requests:', error)
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

  const handleExportMix = async () => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/rooms/${roomId}/export`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tracks: tracks,
          mixSettings: {
            masterVolume: 1.0,
            format: 'wav',
            sampleRate: 44100,
            bitDepth: 16
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Mix exported successfully! Mix ID: ${data.mixId}`)
      } else {
        throw new Error('Export failed')
      }
      
    } catch (error) {
      console.error('Error exporting mix:', error)
      alert('Failed to export mix. Please try again.')
    }
  }

  const handleToggleRecording = () => {
    setIsRecording(!isRecording)
  }

  const handleFileUpload = async (files: File[]) => {
    try {
      const token = localStorage.getItem('token')
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('name', file.name.replace(/\.[^/.]+$/, ''))

        const response = await fetch(`/api/rooms/${roomId}/tracks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })

        if (response.ok) {
          const data = await response.json()
          return data.track
        } else {
          throw new Error(`Failed to upload ${file.name}`)
        }
      })

      const uploadedTracks = await Promise.all(uploadPromises)
      console.log('Successfully uploaded tracks:', uploadedTracks)
      
      // Refresh tracks from server
      await loadTracks()
      setShowUploadModal(false)
    } catch (error) {
      console.error('Error uploading files:', error)
      alert('Failed to upload files. Please try again.')
    }
  }

  const handleCompose = async () => {
    if (selectedTracks.length < 2) {
      alert('Please select at least 2 tracks to compose')
      return
    }

    setIsComposing(true)
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/audio/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roomId,
          trackIds: selectedTracks,
          compositionName: `Composition ${new Date().toLocaleString()}`
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert('Composition created successfully!')
        
        // Refresh compositions
        loadCompositions()
        setSelectedTracks([])
        setShowComposeModal(false)
      } else {
        const error = await response.json()
        alert(`Composition failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating composition:', error)
      alert('Failed to create composition')
    } finally {
      setIsComposing(false)
    }
  }

  const loadCompositions = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/rooms/${roomId}/compositions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCompositions(data.compositions || [])
      }
    } catch (error) {
      console.error('Error loading compositions:', error)
    }
  }

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('Are you sure you want to delete this track? This action cannot be undone.')) {
      return
    }

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
      alert('Track deleted successfully')
    } catch (error) {
      console.error('Error deleting track:', error)
      alert('Failed to delete track')
    }
  }

  const handleJoinRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      setProcessingRequest(requestId)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/rooms/${roomId}/join/${requestId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        // Refresh join requests and room data
        await loadJoinRequests()
        await loadRoomData()
      }
    } catch (error) {
      console.error('Error handling join request:', error)
    } finally {
      setProcessingRequest(null)
    }
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
          <p className="text-gray-400">The music room you&apos;re looking for doesn&apos;ty exist.</p>
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
                    <motion.span 
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="flex items-center text-sm text-green-400"
                    >
                      <Activity className="w-4 h-4 mr-1" />
                      Live
                    </motion.span>
                  )}
                  <span className="flex items-center text-sm text-gray-400">
                    <Clock className="w-4 h-4 mr-1" />
                    {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')}
                  </span>
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
              <button
                onClick={() => {
                  // In Docker environment, OpenDAW runs on port 8080
                  // Get user info for OpenDAW collaboration
                  const token = localStorage.getItem('token')
                  let userName = 'User'
                  
                  if (token) {
                    try {
                      const payload = JSON.parse(atob(token.split('.')[1]))
                      userName = payload.username || `User${userId.slice(0, 4)}`
                    } catch (e) {
                      userName = `User${userId.slice(0, 4)}`
                    }
                  }
                  
                  // Include auth token for database access
                  const authToken = token ? btoa(token) : '' // Base64 encode token for URL
                  const url = `https://localhost:8080?collaborative=true&projectId=room-${roomId}&userId=${userId}&userName=${encodeURIComponent(userName)}&auth_token=${authToken}`;
                  const newWindow = window.open(url, '_blank', 'width=1200,height=800');
                  if (!newWindow) {
                    alert('Please allow popups to open OpenDAW Studio');
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                <Music className="w-4 h-4" />
                <span>Open Studio</span>
              </button>
              {room?.creator === (JSON.parse(localStorage.getItem('user') || '{}').username || 'User') && joinRequests.length > 0 && (
                <button
                  onClick={() => setShowJoinRequests(true)}
                  className="relative flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  <span>Join Requests</span>
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold">
                    {joinRequests.length}
                  </span>
                </button>
              )}
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
              onAddTrack={() => setShowUploadModal(true)}
              onRemoveTrack={handleDeleteTrack}
              onExportMix={handleExportMix}
              isRecording={isRecording}
              onToggleRecording={handleToggleRecording}
              selectedTracks={selectedTracks}
              onTrackSelection={setSelectedTracks}
              onCompose={handleCompose}
              isComposing={isComposing}
              compositions={compositions}
              onDeleteComposition={(id) => {
                setCompositions(prev => prev.filter(c => c.id !== id))
              }}
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
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-400">Live</span>
                  </div>
                  <span className="text-sm text-gray-400">•</span>
                  <span className="text-sm text-gray-400">{room.participants?.length || 0} online</span>
                  <span className="text-sm text-gray-400">•</span>
                  <span className="text-xs text-gray-500">
                    Updated {Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000)}s ago
                  </span>
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
                {room.participants?.map((participant, index) => (
                  <motion.div
                    key={participant._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${
                      newParticipants.includes(participant._id) 
                        ? 'bg-purple-600/20 border border-purple-500/50' 
                        : 'bg-gray-700/50 hover:bg-gray-700/70'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {participant.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {participant.isOnline && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-gray-800 animate-pulse" />
                        )}
                        {newParticipants.includes(participant._id) && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-400 rounded-full border-2 border-gray-800 flex items-center justify-center"
                          >
                            <span className="text-xs font-bold text-gray-900">!</span>
                          </motion.div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-white">{participant.username}</p>
                          {participant.role === 'creator' && (
                            <Crown className="w-4 h-4 text-yellow-400" />
                          )}
                          {participant.isOnline && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-xs bg-green-400/20 text-green-400 px-2 py-0.5 rounded-full"
                            >
                              Active
                            </motion.span>
                          )}
                          {newParticipants.includes(participant._id) && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-xs bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded-full"
                            >
                              Just joined!
                            </motion.span>
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
                      {participant.isOnline && (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-2 h-2 bg-purple-400 rounded-full"
                        />
                      )}
                    </div>
                  </motion.div>
                ))}
                
                {/* Show when room is empty */}
                {(!room.participants || room.participants.length === 0) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                  >
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
                    <p className="text-gray-400">No participants yet</p>
                    <p className="text-sm text-gray-500 mt-1">Invite friends to start collaborating!</p>
                  </motion.div>
                )}
              </div>

              {/* Join Requests Section */}
              {showJoinRequests && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-gray-700 rounded-lg border border-gray-600"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Join Requests</h3>
                    <button
                      onClick={() => setShowJoinRequests(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {joinRequests.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No join requests yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {joinRequests.map((request, index) => (
                        <motion.div
                          key={request._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all duration-300"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-white">
                                  {request.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              {request.isOnline && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-gray-800 animate-pulse" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-white">{request.username}</p>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs bg-purple-400/20 text-purple-400 px-2 py-0.5 rounded-full">
                                  Join Request
                                </span>
                                <span className="text-xs text-gray-400">
                                  {request.createdAt}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleJoinRequest(request._id, 'approve')}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition-colors"
                            >
                              <Check className="w-4 h-4" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleJoinRequest(request._id, 'reject')}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
                            >
                              <X className="w-4 h-4" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
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

      {/* Join Requests Modal */}
      {showJoinRequests && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-md w-full mx-4"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Join Requests</h3>
              <button
                onClick={() => setShowJoinRequests(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {joinRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
                  <p className="text-gray-400">No pending join requests</p>
                </div>
              ) : (
                joinRequests.map((request) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-white">
                              {request.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-white">{request.username}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(request.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {request.message && (
                          <p className="text-sm text-gray-300 mb-3">&quot;{request.message}&quot;</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleJoinRequest(request.id, 'approve')}
                        disabled={processingRequest === request.id}
                        className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleJoinRequest(request.id, 'reject')}
                        disabled={processingRequest === request.id}
                        className="flex items-center space-x-1 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
