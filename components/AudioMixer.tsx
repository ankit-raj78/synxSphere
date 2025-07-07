'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, Pause, Volume2, VolumeX, RotateCcw, Settings, 
  Sliders, Mic, Headphones, Download, Upload, Plus,
  Trash2, Eye, EyeOff, Lock, Unlock, Users, Clock, FileAudio, Music
} from 'lucide-react'
import AudioPlayer from './AudioPlayer'

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

interface AudioMixerProps {
  roomId: string
  userId: string
  tracks: AudioTrack[]
  onTrackUpdate: (trackId: string, updates: Partial<AudioTrack>) => void
  onAddTrack: () => void
  onRemoveTrack: (trackId: string) => void
  onExportMix: () => void
  isRecording?: boolean
  onToggleRecording?: () => void
  isExporting?: boolean
  selectedTracks?: string[]
  onTrackSelection?: (tracks: string[]) => void
  onCompose?: () => void
  isComposing?: boolean
  compositions?: any[]
  onDeleteComposition?: (id: string) => void
}

const trackColors = [
  'from-red-500 to-red-600',
  'from-blue-500 to-blue-600', 
  'from-green-500 to-green-600',
  'from-yellow-500 to-yellow-600',
  'from-purple-500 to-purple-600',
  'from-pink-500 to-pink-600',
  'from-indigo-500 to-indigo-600',
  'from-orange-500 to-orange-600'
]

export default function AudioMixer({ 
  roomId, 
  userId, 
  tracks, 
  onTrackUpdate, 
  onAddTrack, 
  onRemoveTrack,
  onExportMix,
  isRecording = false,
  onToggleRecording,
  isExporting = false,
  selectedTracks = [],
  onTrackSelection,
  onCompose,
  isComposing = false,
  compositions = [],
  onDeleteComposition
}: AudioMixerProps) {
  const [masterVolume, setMasterVolume] = useState(75)
  const [masterMuted, setMasterMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [showEffects, setShowEffects] = useState<{ [key: string]: boolean }>({})
  const [isLooping, setIsLooping] = useState(false)
  const [tempo, setTempo] = useState(120)
  const [exportProgress, setExportProgress] = useState(0)

  const audioContextRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)

  useEffect(() => {
    // Initialize Web Audio API
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      masterGainRef.current = audioContextRef.current.createGain()
      masterGainRef.current.connect(audioContextRef.current.destination)
    }

    // Calculate total duration
    const maxDuration = Math.max(...tracks.map(track => track.duration), 0)
    setTotalDuration(maxDuration)

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [tracks])

  const togglePlayback = () => {
    setIsPlaying(!isPlaying)
    // TODO: Implement actual audio playback logic
    // This would involve coordinating playback across all tracks
  }

  const handleVolumeChange = (trackId: string, volume: number) => {
    onTrackUpdate(trackId, { volume })
    
    // Update audio gain node if available
    const track = tracks.find(t => t.id === trackId)
    if (track?.gainNode && audioContextRef.current) {
      track.gainNode.gain.value = volume / 100
    }
  }

  const handleMute = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId)
    if (track) {
      onTrackUpdate(trackId, { isMuted: !track.isMuted })
    }
  }

  const handleSolo = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId)
    if (track) {
      onTrackUpdate(trackId, { isSolo: !track.isSolo })
    }
  }

  const handleEffectChange = (trackId: string, effect: string, value: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (track) {
      onTrackUpdate(trackId, {
        effects: {
          ...track.effects,
          [effect]: value
        }
      })
    }
  }

  const toggleTrackSelection = (trackId: string) => {
    if (onTrackSelection) {
      const newSelection = selectedTracks.includes(trackId)
        ? selectedTracks.filter(id => id !== trackId)
        : [...selectedTracks, trackId]
      onTrackSelection(newSelection)
    }
  }

  const handleCompose = () => {
    if (onCompose && selectedTracks.length >= 2) {
      onCompose()
    } else {
      alert('Please select at least 2 tracks to compose')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getWaveformPath = (waveform: number[], width: number, height: number) => {
    if (!waveform || waveform.length === 0) return ''
    
    const step = width / waveform.length
    let path = `M 0 ${height / 2}`
    
    waveform.forEach((value, index) => {
      const x = index * step
      const y = height / 2 + (value - 0.5) * height * 0.8
      path += ` L ${x} ${y}`
    })
    
    return path
  }

  const handleExportMix = async () => {
    try {
      setExportProgress(0)
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Call the parent's export function
      await onExportMix()

      clearInterval(progressInterval)
      setExportProgress(100)
      
      setTimeout(() => {
        setExportProgress(0)
      }, 2000)
      
    } catch (error) {
      console.error('Error exporting mix:', error)
      alert('Failed to export mix. Please try again.')
      setExportProgress(0)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Mixer Header */}
      <div className="bg-black/40 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-bold text-white">Audio Mixer</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{formatTime(currentTime)} / {formatTime(totalDuration)}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Users className="w-4 h-4" />
              <span>{tracks.length} tracks</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`p-2 rounded-lg transition-colors ${
                isLooping ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Loop"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            
            {onToggleRecording && (
              <button
                onClick={onToggleRecording}
                className={`p-2 rounded-lg transition-colors ${
                  isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title={isRecording ? 'Stop Recording' : 'Start Recording'}
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={onAddTrack}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white font-medium shadow-lg"
              title="Upload Audio File to Room"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Track</span>
            </button>

            {onCompose && (
              <button
                onClick={handleCompose}
                disabled={isComposing || selectedTracks.length < 2}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors text-white font-medium ${
                  isComposing || selectedTracks.length < 2
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700 shadow-lg'
                }`}
                title={`Compose music from selected tracks (${selectedTracks.length} selected)`}
              >
                {isComposing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Composing...</span>
                  </>
                ) : (
                  <>
                    <Music className="w-4 h-4" />
                    <span>Compose ({selectedTracks.length})</span>
                  </>
                )}
              </button>
            )}
            
            <button
              onClick={onExportMix}
              disabled={isExporting || tracks.length === 0}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors text-white font-medium ${
                isExporting || tracks.length === 0
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 shadow-lg'
              }`}
              title={isExporting ? `Exporting... ${exportProgress}%` : 'Export & Download Mixed Audio'}
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Mixing... {exportProgress}%</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Mix & Export</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Transport Controls */}
        <div className="flex items-center justify-center space-x-4 mt-4">
          <button
            onClick={togglePlayback}
            className="w-12 h-12 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center transition-colors"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </button>
          
          {/* Timeline */}
          <div className="flex-1 max-w-md">
            <div className="h-2 bg-gray-700 rounded-full relative">
              <div 
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%` }}
              />
              <div 
                className="absolute top-0 w-1 h-full bg-white rounded-full shadow-lg"
                style={{ left: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Master Volume */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMasterMuted(!masterMuted)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {masterMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <div className="w-20 h-2 bg-gray-700 rounded-full">
              <div 
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${masterMuted ? 0 : masterVolume}%` }}
              />
            </div>
            <span className="text-sm text-gray-400 w-8">{masterVolume}</span>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="max-h-96 overflow-y-auto">
        {tracks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="mb-4">
              <FileAudio className="w-16 h-16 mx-auto text-gray-400 opacity-50" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Audio Tracks Yet</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Upload audio files to start collaborating! Each user can contribute their own tracks to create amazing music together.
            </p>
            <button
              onClick={onAddTrack}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white font-medium"
            >
              <Upload className="w-5 h-5" />
              <span>Upload Your First Track</span>
            </button>
            <div className="mt-4 text-sm text-gray-500">
              Supported formats: MP3, WAV, FLAC, M4A • Max size: 50MB
            </div>
          </motion.div>
        ) : (
          <AnimatePresence>
            {tracks.map((track, index) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="border-b border-gray-700 last:border-b-0"
            >
              <div className="p-4 hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center space-x-4">
                  {/* Track Color & Number */}
                  <div className={`w-8 h-8 bg-gradient-to-r ${trackColors[index % trackColors.length]} rounded-lg flex items-center justify-center text-white text-sm font-bold`}>
                    {index + 1}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-white font-medium truncate">{track.name}</h4>
                        <p className="text-sm text-gray-400">by {track.uploadedBy.username}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        {track.isLocked && <Lock className="w-4 h-4 text-yellow-400" />}
                        {track.isSolo && <Eye className="w-4 h-4 text-green-400" />}
                        {track.isMuted && <VolumeX className="w-4 h-4 text-red-400" />}
                      </div>
                    </div>

                    {/* Waveform */}
                    <div className="h-12 bg-gray-800 rounded-lg relative overflow-hidden mb-2">
                      <svg width="100%" height="100%" className="absolute inset-0">
                        <path
                          d={getWaveformPath(track.waveform, 400, 48)}
                          stroke={`url(#gradient-${track.id})`}
                          strokeWidth="1"
                          fill="none"
                          opacity="0.8"
                        />
                        <defs>
                          <linearGradient id={`gradient-${track.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" className={`text-${trackColors[index % trackColors.length].split('-')[1]}-400`} stopColor="currentColor" />
                            <stop offset="100%" className={`text-${trackColors[index % trackColors.length].split('-')[1]}-600`} stopColor="currentColor" />
                          </linearGradient>
                        </defs>
                      </svg>
                      
                      {/* Playback progress overlay */}
                      <div 
                        className="absolute top-0 left-0 h-full bg-white/20 transition-all"
                        style={{ width: `${track.duration > 0 ? (currentTime / track.duration) * 100 : 0}%` }}
                      />
                    </div>

                    {/* Track Controls */}
                    <div className="flex items-center space-x-3 mb-2">
                      {/* Selection checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedTracks.includes(track.id)}
                        onChange={() => toggleTrackSelection(track.id)}
                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                        title="Select for composition"
                      />

                      {/* Mute */}
                      <button
                        onClick={() => handleMute(track.id)}
                        className={`p-1 rounded transition-colors ${
                          track.isMuted ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                        title="Mute"
                      >
                        <VolumeX className="w-4 h-4" />
                      </button>

                      {/* Solo */}
                      <button
                        onClick={() => handleSolo(track.id)}
                        className={`p-1 rounded transition-colors ${
                          track.isSolo ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                        title="Solo"
                      >
                        <Headphones className="w-4 h-4" />
                      </button>

                      {/* Volume */}
                      <div className="flex items-center space-x-2 flex-1">
                        <Volume2 className="w-4 h-4 text-gray-400" />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={track.volume}
                          onChange={(e) => handleVolumeChange(track.id, parseInt(e.target.value))}
                          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-sm text-gray-400 w-8">{track.volume}</span>
                      </div>

                      {/* Effects */}
                      <button
                        onClick={() => setShowEffects(prev => ({ ...prev, [track.id]: !prev[track.id] }))}
                        className={`p-1 rounded transition-colors ${
                          showEffects[track.id] ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                        title="Effects"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => onRemoveTrack(track.id)}
                        className="p-1 bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white rounded transition-colors"
                        title="Remove Track"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Audio Player */}
                    <div className="mb-2">
                      <AudioPlayer fileId={track.id} className="w-full" />
                    </div>

                    {/* Effects Panel */}
                    <AnimatePresence>
                      {showEffects[track.id] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 p-3 bg-gray-800 rounded-lg"
                        >
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {Object.entries(track.effects).map(([effect, value]) => (
                              <div key={effect} className="space-y-1">
                                <label className="text-xs text-gray-400 capitalize">{effect}</label>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={value}
                                  onChange={(e) => handleEffectChange(track.id, effect, parseInt(e.target.value))}
                                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-xs text-gray-500">{value}%</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
