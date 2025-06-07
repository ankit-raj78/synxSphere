'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Music, Upload, Users, Brain, Activity, Play, Settings, 
  Plus, TrendingUp, Clock, Star, Mic, Headphones, Volume2, LogOut
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import RoomRecommendations from '../../components/RoomRecommendations'
import FileUpload from '../../components/FileUpload'
import AudioPlayer from '../../components/AudioPlayer'
import RoomCreation from '../../components/RoomCreation'

interface User {
  _id: string
  email: string
  username: string
  profile: {
    instruments: string[]
    genres: string[]
    experience: string
    collaborationGoals: string[]
    musicalAnalysis?: any
  }
}

interface AudioFile {
  _id: string
  filename: string
  originalName: string
  uploadedAt: string
  audioFeatures?: any
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed'
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (!token || !userData) {
      router.push('/auth/login')
      return
    }

    try {
      setUser(JSON.parse(userData))
      loadUserFiles()
      
      // Check for tab parameter in URL
      const urlParams = new URLSearchParams(window.location.search)
      const tab = urlParams.get('tab')
      if (tab) {
        setActiveTab(tab)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      router.push('/auth/login')
    }
  }, [router])

  const loadUserFiles = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/audio/files', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const files = await response.json()
        setAudioFiles(files)
      }
    } catch (error) {
      console.error('Error loading files:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (files: File[]) => {
    const token = localStorage.getItem('token')
    const formData = new FormData()
    
    files.forEach(file => formData.append('audio', file))

    try {
      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        await loadUserFiles()
      }
    } catch (error) {
      console.error('Upload error:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="music-wave h-6 w-1"></div>
          <div className="music-wave h-8 w-1"></div>
          <div className="music-wave h-6 w-1"></div>
          <span className="text-xl ml-4">Loading your musical profile...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Navigation */}
      <nav className="bg-gray-800/50 backdrop-blur-md border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">SyncSphere</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Welcome, {user?.username}</span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-gray-400 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-800 p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Overview', icon: Music },
            { id: 'upload', label: 'Upload Music', icon: Upload },
            { id: 'rooms', label: 'Find Rooms', icon: Users },
            { id: 'create-room', label: 'Create Room', icon: Plus },
            { id: 'analysis', label: 'AI Analysis', icon: Brain },
            { id: 'profile', label: 'Profile', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400">Uploaded Tracks</p>
                      <p className="text-3xl font-bold">{audioFiles.length}</p>
                    </div>
                    <Activity className="w-8 h-8 text-primary-400" />
                  </div>
                </div>
                
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400">AI Analysis</p>
                      <p className="text-3xl font-bold">
                        {audioFiles.filter(f => f.analysisStatus === 'completed').length}
                      </p>
                    </div>
                    <Brain className="w-8 h-8 text-secondary-400" />
                  </div>
                </div>
                
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400">Collaborations</p>
                      <p className="text-3xl font-bold">0</p>
                    </div>
                    <Users className="w-8 h-8 text-accent-400" />
                  </div>
                </div>
              </div>

              {/* Recent Files */}
              <div className="card">
                <h3 className="text-xl font-bold mb-4">Your Music Library</h3>
                {audioFiles.length === 0 ? (
                  <div className="text-center py-8">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No music uploaded yet</p>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="btn-primary mt-4"
                    >
                      Upload Your First Track
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {audioFiles.slice(0, 5).map((file) => (
                      <div key={file._id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                            <Music className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">{file.originalName}</p>
                            <p className="text-sm text-gray-400">
                              {new Date(file.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {file.analysisStatus === 'completed' && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                              Analyzed
                            </span>
                          )}
                          {file.analysisStatus === 'processing' && (
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                              Processing
                            </span>
                          )}
                          <AudioPlayer fileId={file._id} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="card max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Upload Your Music</h2>
              <p className="text-gray-400 mb-8">
                Upload your tracks and let our AI analyze your musical style for perfect collaborator matching.
              </p>
              <FileUpload onFilesUploaded={handleFileUpload} />
            </div>
          )}

          {activeTab === 'rooms' && (
            <RoomRecommendations userId={user?._id || ''} />
          )}

          {activeTab === 'create-room' && (
            <RoomCreation />
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <div className="card">
                <h2 className="text-2xl font-bold mb-6">AI Musical Analysis</h2>
                <p className="text-gray-400 mb-8">
                  Discover insights about your musical style and preferences.
                </p>
                
                {audioFiles.filter(f => f.analysisStatus === 'completed').length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No analyzed tracks yet</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Upload some music to see AI analysis results
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {audioFiles
                      .filter(f => f.analysisStatus === 'completed')
                      .map((file) => (
                        <div key={file._id} className="bg-gray-700 rounded-lg p-4">
                          <h4 className="font-semibold mb-3">{file.originalName}</h4>
                          {file.audioFeatures && (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Tempo:</span>
                                <span>{Math.round(file.audioFeatures.tempo)} BPM</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Key:</span>
                                <span>{file.audioFeatures.key}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Energy:</span>
                                <span>{Math.round(file.audioFeatures.energy * 100)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Complexity:</span>
                                <span>{Math.round(file.audioFeatures.harmonicComplexity * 100)}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && user && (
            <div className="card max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Your Profile</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Username</label>
                    <div className="px-4 py-3 bg-gray-700 rounded-lg text-gray-300">
                      {user.username}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <div className="px-4 py-3 bg-gray-700 rounded-lg text-gray-300">
                      {user.email}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Instruments</label>
                  <div className="flex flex-wrap gap-2">
                    {user.profile?.instruments?.map((instrument: string) => (
                      <span key={instrument} className="px-3 py-1 bg-primary-600 text-white rounded-full text-sm">
                        {instrument}
                      </span>
                    )) || <span className="text-gray-400">No instruments specified</span>}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Genres</label>
                  <div className="flex flex-wrap gap-2">
                    {user.profile?.genres?.map((genre: string) => (
                      <span key={genre} className="px-3 py-1 bg-secondary-600 text-white rounded-full text-sm">
                        {genre}
                      </span>
                    )) || <span className="text-gray-400">No genres specified</span>}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Experience Level</label>
                  <div className="px-4 py-3 bg-gray-700 rounded-lg text-gray-300">
                    {user.profile?.experience || 'Not specified'}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Collaboration Goals</label>
                  <div className="flex flex-wrap gap-2">
                    {user.profile?.collaborationGoals?.map((goal: string) => (
                      <span key={goal} className="px-3 py-1 bg-accent-600 text-white rounded-full text-sm">
                        {goal}
                      </span>
                    )) || <span className="text-gray-400">No goals specified</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
