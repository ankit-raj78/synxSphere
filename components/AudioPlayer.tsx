'use client'

import { useState, useRef } from 'react'
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react'

interface AudioPlayerProps {
  fileId: string
  className?: string
}

export default function AudioPlayer({ fileId, className = '' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const togglePlay = async () => {
    if (!audioRef.current) return

    // Clear any previous errors
    setError(null)

    // Debug: Check if fileId is valid
    console.log('AudioPlayer fileId:', fileId)
    if (!fileId || fileId === 'undefined') {
      console.error('Invalid fileId:', fileId)
      setError('Invalid audio file')
      return
    }

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      if (!audioRef.current.src) {
        setLoading(true)
        try {
          const token = localStorage.getItem('token')
          console.log('Fetching audio stream for fileId:', fileId)
          
          // Try the tracks endpoint first, then fall back to the general audio stream
          let response = await fetch(`/api/audio/tracks/${fileId}/stream`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          // If tracks endpoint fails, try the general audio stream endpoint
          if (!response.ok) {
            console.log('Tracks endpoint failed, trying general audio stream')
            response = await fetch(`/api/audio/stream/${fileId}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
          }
          
          console.log('Audio stream response:', response.status, response.statusText)
          console.log('Response content-type:', response.headers.get('content-type'))
          console.log('Response content-length:', response.headers.get('content-length'))
            if (response.ok) {
            // For large files, use response URL directly instead of converting to Blob
            const contentLength = parseInt(response.headers.get('content-length') || '0')
            if (contentLength > 20 * 1024 * 1024) { // Use direct URL for files above 20MB
              console.log('Large file detected, using direct streaming')
              
              // Set API URL directly, let browser handle streaming
              const directUrl = `/api/audio/tracks/${fileId}/stream?auth=${encodeURIComponent(token || '')}`
              audioRef.current.src = directUrl
              audioRef.current.load()
              console.log('Audio element loaded with direct URL')
            } else {
              console.log('Starting blob conversion...')
              const blob = await response.blob()
              console.log('Blob created, size:', blob.size, 'type:', blob.type)
              const audioUrl = URL.createObjectURL(blob)
              console.log('Audio src set:', audioUrl.substring(0, 50) + '...')
              
              // Set src and load the audio
              audioRef.current.src = audioUrl
              audioRef.current.load()
              console.log('Audio element loaded with blob URL')
            }
            
            // Wait for audio to be ready, then play
            try {
              console.log('Audio loaded, attempting to play...')
              await audioRef.current.play()
              setIsPlaying(true)
              console.log('Audio playback started successfully')
            } catch (playError) {
              console.error('Error playing audio:', playError)
              // Handle autoplay restrictions
              if ((playError as Error).name === 'NotAllowedError') {
                console.log('Autoplay blocked - user interaction required')
                setError('Click play to start audio')
              } else {
                setError('Cannot play audio')
              }
            }
            
          } else {
            const errorText = await response.text()
            console.error('Audio stream error:', errorText)
            setError('Failed to load audio')
          }
        } catch (error) {
          console.error('Error loading audio:', error)
          console.error('Error details:', {
            message: (error as Error).message,
            name: (error as Error).name,
            stack: (error as Error).stack
          })
          
          setError(`Network error: ${(error as Error).message || 'Unknown error'}`)
        } finally {
          setLoading(false)
        }
      } else {
        // Audio already loaded, just play
        try {
          console.log('Audio already loaded, playing...')
          await audioRef.current.play()
          setIsPlaying(true)
          console.log('Audio playback started successfully')
        } catch (error) {
          console.error('Error playing audio:', error)
          // Handle autoplay restrictions
          if ((error as Error).name === 'NotAllowedError') {
            console.log('Autoplay blocked - user interaction required')
            setError('Click play to start audio')
          } else {
            setError('Cannot play audio')
          }
        }
      }
    }
  }
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const restartAudio = () => {
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.currentTime = 0
      setCurrentTime(0)
      if (!isPlaying) {
        audioRef.current.play()
        setIsPlaying(true)
      }
      console.log('Audio restarted from beginning')
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
      console.log('Audio metadata loaded, duration:', audioRef.current.duration)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
    console.log('Audio playback ended')
  }

  const handleError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    console.error('Audio error event:', e)
    setLoading(false)
    setIsPlaying(false)
    setError('Audio playback error')
  }

  const handlePlay = () => {
    setIsPlaying(true)
    setError(null) // Clear errors on successful play
    console.log('Audio play event triggered')
  }

  const handlePause = () => {
    setIsPlaying(false)
    console.log('Audio pause event triggered')
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const clickPosition = (e.clientX - rect.left) / rect.width
    const newTime = clickPosition * duration
    
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={handleError}
        preload="none"
      />
      
      <button
        onClick={togglePlay}
        disabled={loading}
        className="w-8 h-8 flex items-center justify-center bg-primary-600 hover:bg-primary-700 rounded-full transition-colors disabled:opacity-50"
        title={error || ''}
      >
        {loading ? (
          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
        ) : isPlaying ? (
          <Pause className="w-4 h-4 text-white" />
        ) : (
          <Play className="w-4 h-4 text-white ml-0.5" />
        )}
      </button>

      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}

      {duration > 0 && (
        <>
          <div 
            className="flex-1 h-2 bg-gray-600 rounded-full cursor-pointer"
            onClick={handleProgressClick}
          >
            <div
              className="h-2 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all duration-100"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
            <span className="text-xs text-gray-400 min-w-[40px]">
            {formatTime(currentTime)}
          </span>
          
          <button
            onClick={restartAudio}
            className="text-gray-400 hover:text-white"
            title="Replay from start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            onClick={toggleMute}
            className="text-gray-400 hover:text-white"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </>
      )}
    </div>
  )
}
