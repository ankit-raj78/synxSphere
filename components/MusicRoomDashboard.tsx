'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Music, Users, Clock, Play, Pause, Volume2, Share2, 
  MoreHorizontal, Heart, MessageCircle, UserPlus,
  Mic, Headphones, Radio, Settings, Crown, Upload, Layers, Trash2, ArrowLeft, Bell, X, User
} from 'lucide-react'
import FileUpload from './FileUpload'
import RoomFileUpload from './RoomFileUpload'
import { formatDateTime } from '../lib/date-utils'


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
  const [showComposeModal, setShowComposeModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showJoinRequestsModal, setShowJoinRequestsModal] = useState(false)
  const [joinRequests, setJoinRequests] = useState<any[]>([])
  const [uploadedTracks, setUploadedTracks] = useState<any[]>([])
  const [compositions, setCompositions] = useState<any[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([])
  const [isComposing, setIsComposing] = useState(false)
  const [currentPlayingTrack, setCurrentPlayingTrack] = useState<string | null>(null)
  const [currentPlayingType, setCurrentPlayingType] = useState<'track' | 'composition' | null>(null)
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [previousRequestCount, setPreviousRequestCount] = useState(0)


  useEffect(() => {
    loadRoomData()
    loadTracks()
    // Simulate real-time updates every 5 seconds
    const interval = setInterval(() => {
      setCurrentTime(prev => prev + 1)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [roomId])

  // Poll for join requests if user is room creator
  useEffect(() => {
    if (!room || !isRoomCreator()) return
    
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
    
    // Initial fetch
    fetchJoinRequests()
    
    // Set up polling
    const interval = setInterval(() => {
      fetchJoinRequests()
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [room, roomId]) // Depend on room being loaded

  const fetchJoinRequests = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const requests = data.requests || []
        console.log('Join requests fetched:', requests.length, 'requests')
        
        // Check for new requests and show notification
        if (requests.length > previousRequestCount && previousRequestCount > 0) {
          // New request(s) received
          const newRequestCount = requests.length - previousRequestCount
          
          // Show browser notification
          if (Notification.permission === 'granted') {
            new Notification(`${newRequestCount} new join request${newRequestCount > 1 ? 's' : ''}`, {
              body: 'Users want to join your collaboration room',
              icon: '/favicon.ico'
            })
          }
            // Play notification sound
          try {
            // Create a simple beep sound using Web Audio API
            const context = new AudioContext()
            const oscillator = context.createOscillator()
            const gainNode = context.createGain()
            
            oscillator.connect(gainNode)
            gainNode.connect(context.destination)
            
            // Create a pleasant notification sound (C major chord)
            oscillator.frequency.setValueAtTime(523, context.currentTime) // C5
            oscillator.frequency.setValueAtTime(659, context.currentTime + 0.1) // E5
            oscillator.frequency.setValueAtTime(784, context.currentTime + 0.2) // G5
            
            gainNode.gain.setValueAtTime(0.1, context.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.8)
            
            oscillator.start(context.currentTime)
            oscillator.stop(context.currentTime + 0.8)
          } catch (error) {
            console.log('Could not play notification sound:', error)
          }
        }
        
        setPreviousRequestCount(requests.length)
        setJoinRequests(requests)
      } else {
        console.log('Failed to fetch join requests:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching join requests:', error)
    }
  }

  const fetchRoomData = async () => {

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
  const fetchUploadedTracks = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // Fetch room-specific files (shared with all participants)
      const roomFilesResponse = await fetch(`/api/rooms/${roomId}/files`, {

        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (roomFilesResponse.ok) {
        const roomFiles = await roomFilesResponse.json()
        setUploadedTracks(roomFiles)
      } else {
        console.error('Error fetching room files:', roomFilesResponse.status)
        // Fallback to user's personal files if room files fail
        const personalFilesResponse = await fetch('/api/audio/files', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (personalFilesResponse.ok) {
          const personalFiles = await personalFilesResponse.json()
          setUploadedTracks(personalFiles)
        }

      }
    } catch (error) {
      console.error('Error loading tracks:', error)
    }
  }
  const fetchCompositions = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // Fetch room-specific compositions (shared with all participants)
      const roomCompositionsResponse = await fetch(`/api/rooms/${roomId}/compositions`, {

        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ trackId, updates })
      })
      
      if (roomCompositionsResponse.ok) {
        const roomCompositions = await roomCompositionsResponse.json()
        setCompositions(roomCompositions)
      } else {
        console.error('Error fetching room compositions:', roomCompositionsResponse.status)
        // Fallback to user's personal compositions if room compositions fail
        const personalCompositionsResponse = await fetch('/api/audio/compositions', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (personalCompositionsResponse.ok) {
          const personalCompositions = await personalCompositionsResponse.json()
          setCompositions(personalCompositions)
        }
      }

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
    if (tracks.length === 0) {
      alert('No tracks available to mix. Please upload some audio files first.')
      return
    }

    if (tracks.length === 1) {
      alert('Please upload at least 2 tracks to create a mix.')
      return
    }    setIsComposing(true)
    try {
      const token = localStorage.getItem('token');

      const response = await fetch('/api/audio/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          trackIds: tracks.map(track => track.id),
          roomId: roomId,
          settings: {
            format: 'mp3',
            bitrate: '192k',
            sampleRate: 44100,
            masterVolume: 1.0,
            fadeIn: 0,
            fadeOut: 2
          }
        })
      });

      if (response.ok) {
        const result = await response.json()
        // Refresh both lists to show new composition
        await fetchUploadedTracks()
        await fetchCompositions()
        alert(`Composition successful! File saved as: ${result.outputFile}`)
        setSelectedTracks([])
        setShowComposeModal(false)      } else {
        const error = await response.json();
        alert(`Composition failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Error composing tracks:', error)
      alert('Composition failed')    } finally {
      setIsComposing(false)
    }
  };

  const toggleTrackSelection = (trackId: string) => {
    setSelectedTracks((prev: string[]) => 
      prev.includes(trackId) 
        ? prev.filter((id: string) => id !== trackId)
        : [...prev, trackId]
    )
  }

  // Check if current user is the room creator
  const isRoomCreator = () => {
    if (!room) return false
      // Check if current user is the creator via participants role
    const isCreator = room.participants.some(p => p.id === userId && p.role === 'creator');
    console.log('Checking if user is room creator:', { userId, isCreator, participants: room.participants })
    return isCreator
  }

  // Delete room function
  const handleDeleteRoom = async () => {
    if (!confirm('Are you sure you want to delete this room? This action cannot be undone and all participants will be removed.')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('Room deleted successfully')
        // Redirect to dashboard
        router.push('/dashboard')
      } else {
        const error = await response.json()
        alert(`Failed to delete room: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting room:', error)
      alert('Error occurred while deleting room')
    }
  }

  // Handle join request approval/rejection
  const handleJoinRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/rooms/${roomId}/join/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },        body: JSON.stringify({ action })
      })

      if (response.ok) {
        alert(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
        // Refresh join requests and room data
        fetchJoinRequests()
        fetchRoomData()
      } else {
        const error = await response.json()
        alert(`Failed to handle request: ${error.error}`)
      }
    } catch (error) {
      console.error('Error handling join request:', error)
      alert('Error occurred while handling request')    }
  }

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('Are you sure you want to delete this audio file? This action cannot be undone.')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/audio/delete?id=${trackId}`, {
        method: 'DELETE',        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Refresh audio files list
        await fetchUploadedTracks()
        alert('File deleted successfully!')
      } else {
        const error = await response.json()
        alert(`Delete failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting track:', error)
      alert('Delete failed')
    }
  }
  
  const handlePlayTrack = async (track: any) => {
    try {
      // If currently playing the same track, pause it
      if (currentPlayingTrack === track.id && currentPlayingType === 'track' && audioRef && !audioRef.paused) {
        audioRef.pause()
        setCurrentPlayingTrack(null)
        setCurrentPlayingType(null)
        setIsPlaying(false)
        return
      }

      // Stop current playback
      if (audioRef) {
        audioRef.pause()
        audioRef.currentTime = 0
      }

      // Create new audio element
      const newAudio = new Audio()
      setAudioRef(newAudio)

      // Get audio file URL
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/audio/stream/${track.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })


      if (response.ok) {
        alert(`Mix created successfully! File: ${data.outputFile}`)
        // Reload tracks to show the new composition
        await loadTracks()
      } else {
        throw new Error(data.error || 'Mix creation failed')
      }
    } catch (error) {
      console.error('Error exporting mix:', error)
      alert(`Failed to create mix: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleToggleRecording = () => {
    setIsRecording(!isRecording)
  }
  const formatAudioTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const [volume, setVolume] = useState(75)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    // Simulate real-time updates every 5 seconds
    const interval = setInterval(() => {
      setCurrentTime(prev => prev + 1)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [roomId])


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
          <p className="text-gray-400">The music room you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/20 backdrop-blur-sm">        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex items-center space-x-2 text-gray-400 hover:text-white"
                title="Go back to dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />

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
            </div>            <div className="flex items-center space-x-3">              <button 

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
              {isRoomCreator() && (
                <button 
                  onClick={handleDeleteRoom}
                  className="p-2 hover:bg-red-800 text-red-400 hover:text-red-300 rounded-lg transition-colors"
                  title="Delete Room"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}            </div>
          </div>
        </div>
      </div>

      {/* Join Requests Notification Bar */}
      {isRoomCreator() && joinRequests.length > 0 && (
        <div className="border-b border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-amber-500/10 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center animate-pulse">
                  <Bell className="w-3 h-3 text-white" />
                </div>
                <div>
                  <p className="text-orange-200 font-medium">
                    {joinRequests.length} new join request{joinRequests.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-orange-300/80 text-sm">
                    Users want to join your collaboration room
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowJoinRequestsModal(true)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Review Requests</span>
                </button>
                <button
                  onClick={() => setJoinRequests([])}
                  className="p-2 hover:bg-orange-500/20 rounded-lg transition-colors text-orange-300 hover:text-orange-200"
                  title="Dismiss notifications"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

              <div className="space-y-3">
                {uploadedTracks.length > 0 ? (
                  uploadedTracks.map((track, index) => (
                    <div 
                      key={track.id}
                      className={`p-3 rounded-lg transition-colors ${
                        currentPlayingTrack === track.id && currentPlayingType === 'track'
                          ? 'bg-purple-600/20 border border-purple-500/30' 
                          : 'bg-gray-700/50 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-400">
                          {currentPlayingTrack === track.id && currentPlayingType === 'track' ? (
                            <div className="flex space-x-1">
                              <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse" />
                              <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                              <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                            </div>
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div className="flex-1">                          <h4 className="font-medium">{track.original_name}</h4>
                          <div className="text-sm text-gray-400 flex items-center space-x-2">
                            {track.uploader_name && (
                              <>
                                <span className="flex items-center">
                                  <User className="w-3 h-3 mr-1" />
                                  {track.uploader_name}
                                </span>
                                <span>•</span>
                              </>
                            )}
                            <span>{Math.round(track.file_size / 1024)} KB</span>
                            <span>•</span>
                            <span>{track.mime_type}</span>
                            <span>•</span>
                            <span>{formatDateTime(track.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handlePlayTrack(track)}
                            className={`p-2 hover:bg-gray-600 rounded-lg transition-colors ${
                              currentPlayingTrack === track.id && currentPlayingType === 'track'
                                ? 'text-purple-400 hover:text-purple-300' 
                                : 'text-green-400 hover:text-green-300'
                            }`}
                            title={currentPlayingTrack === track.id && currentPlayingType === 'track' ? "Pause" : "Play"}
                          >
                            {currentPlayingTrack === track.id && currentPlayingType === 'track' ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>                          {track.user_id === userId && (
                            <button
                              onClick={() => handleDeleteTrack(track.id)}
                              className="p-2 hover:bg-gray-600 rounded-lg transition-colors text-red-400 hover:text-red-300"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      {currentPlayingTrack === track.id && currentPlayingType === 'track' && (
                        <div className="mt-3 space-y-2">
                          <div 
                            className="w-full h-2 bg-gray-700 rounded-full cursor-pointer"
                            onClick={handleProgressClick}
                          >
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-100"
                              style={{ width: `${audioProgress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>{formatAudioTime(audioRef?.currentTime || 0)}</span>
                            <span>{formatAudioTime(audioDuration)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No audio files uploaded yet</p>
                    <p className="text-sm mt-1">Click "Add Track" to get started</p>
                  </div>
                )}

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
                        <div className="flex-1">
                          <h4 className="font-medium flex items-center space-x-2">
                            <span>{composition.title}</span>
                            <span className="text-xs bg-pink-600/20 text-pink-400 px-2 py-1 rounded-full">
                              Composition
                            </span>
                          </h4>                          <div className="text-sm text-gray-400 flex items-center space-x-2">
                            <span>{Math.round(composition.file_size / 1024)} KB</span>
                            <span>•</span>
                            <span>{composition.mime_type}</span>
                            <span>•</span>
                            <span className="text-pink-400">
                              {composition.source_track_count} tracks mixed
                            </span>
                            <span>•</span>
                            <span className="text-blue-400">
                              by {composition.composer_name || 'Unknown'}
                            </span>
                            <span>•</span>
                            <span className="text-pink-400">
                              {formatDateTime(composition.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handlePlayComposition(composition)}
                            className={`p-2 hover:bg-gray-600 rounded-lg transition-colors ${
                              currentPlayingTrack === composition.id && currentPlayingType === 'composition'
                                ? 'text-pink-400 hover:text-pink-300' 
                                : 'text-green-400 hover:text-green-300'
                            }`}
                            title={currentPlayingTrack === composition.id && currentPlayingType === 'composition' ? "Pause" : "Play"}
                          >
                            {currentPlayingTrack === composition.id && currentPlayingType === 'composition' ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}                          </button>
                          {composition.user_id === userId && (
                            <button
                              onClick={() => handleDeleteComposition(composition.id)}
                              className="p-2 hover:bg-gray-600 rounded-lg transition-colors text-red-400 hover:text-red-300"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

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
          </motion.div>        </div>
      )}      {/* Upload Modal */}
      {showUploadModal && (
        <RoomFileUpload
          roomId={roomId}
          onFilesUploaded={handleFilesUploaded}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Compose Audio Tracks</h3>
              <button
                onClick={() => setShowComposeModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-400 mb-4">Select tracks to compose together:</p>
              <div className="grid gap-3 max-h-60 overflow-y-auto">
                {uploadedTracks.map((track) => (
                  <div
                    key={track.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTracks.includes(track.id)
                        ? 'border-purple-500 bg-purple-600/20'
                        : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                    }`}
                    onClick={() => toggleTrackSelection(track.id)}
                  >                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{track.original_name}</div>
                        <div className="text-sm text-gray-400">
                          {Math.round(track.file_size / 1024)} KB • {track.mime_type}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTrack(track.id)
                          }}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                          title="Delete file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className={`w-5 h-5 rounded border-2 ${
                          selectedTracks.includes(track.id)
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-gray-400'
                        }`}>
                          {selectedTracks.includes(track.id) && (
                            <svg className="w-3 h-3 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                {selectedTracks.length} tracks selected
                {selectedTracks.length < 2 && ' (minimum 2 required)'}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompose}
                  disabled={selectedTracks.length < 2 || isComposing}
                  className="px-6 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
                >
                  {isComposing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Composing...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4" />
                      <span>Compose Tracks</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>        </div>
      )}

      {/* Join Requests Modal */}
      {showJoinRequestsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
          >            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Join Requests</h3>
              <button
                onClick={() => setShowJoinRequestsModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">              {joinRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No join requests pending</p>
                </div>
              ) : (
                joinRequests.map((request) => (
                  <div key={request.id} className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold">
                            {request.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{request.username}</p>
                          <p className="text-sm text-gray-400">
                            {new Date(request.createdAt).toLocaleString()}
                          </p>
                          {request.message && (
                            <p className="text-sm text-gray-300 mt-1">"{request.message}"</p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">                        <button
                          onClick={() => handleJoinRequest(request.id, 'approve')}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleJoinRequest(request.id, 'reject')}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

      )}
    </div>
  )
}
