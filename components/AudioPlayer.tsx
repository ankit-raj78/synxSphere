'use client'

import { useState, useRef, useEffect } from 'react'
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

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current.load()
      }
    }
  }, [])

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
          console.log('Fetching audio stream for fileId:', fileId)
          
          // Simplified approach: Set the audio src directly to the API endpoint
          const audioStreamUrl = `/api/audio/stream/${fileId}`
          console.log('Setting audio src to:', audioStreamUrl)
          
          audioRef.current.src = audioStreamUrl
          audioRef.current.load()
          
          console.log('Audio element src set and loaded')
          setLoading(false)
          
          // Try to play after loading
          try {
            console.log('Attempting to play audio...')
            await audioRef.current.play()
            setIsPlaying(true)
            console.log('Audio playback started successfully')
          } catch (playError) {
            console.error('Error playing audio:', playError)
            if ((playError as Error).name === 'NotAllowedError') {
              console.log('Autoplay blocked - user interaction required')
              setError('Click play to start audio')
            } else {
              setError('Cannot play audio')
            }
          }
        } catch (error) {
          console.error('Error setting up audio:', error)
          setError(`Setup error: ${(error as Error).message || 'Unknown error'}`)
          setLoading(false)
        }
      } else {
        // Audio already loaded, just play
        try {
          console.log('Audio already loaded, playing...')
          
          // Check if audio has a valid source before attempting to play
          if (!audioRef.current.src || audioRef.current.src === '') {
            console.error('No audio source available')
            setError('No audio source loaded')
            return
          }
          
          await audioRef.current.play()
          setIsPlaying(true)
          console.log('Audio playback started successfully')
        } catch (error) {
          console.error('Error playing audio:', error)
          
          // Handle different types of playback errors
          if ((error as Error).name === 'NotAllowedError') {
            console.log('Autoplay blocked - user interaction required')
            setError('Click play to start audio')
          } else if ((error as Error).name === 'NotSupportedError') {
            console.log('Audio format not supported or no valid source')
            setError('Audio format not supported')
            // Clear the invalid source and reset
            audioRef.current.src = ''
            audioRef.current.load()
          } else {
            setError(`Cannot play audio: ${(error as Error).message}`)
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
    console.error('Audio element error code:', audioRef.current?.error?.code)
    console.error('Audio element error message:', audioRef.current?.error?.message)
    console.error('Audio element src:', audioRef.current?.src)
    console.error('Audio element readyState:', audioRef.current?.readyState)
    console.error('Audio element networkState:', audioRef.current?.networkState)
    console.error('Expected audio src should be:', `/api/audio/stream/${fileId}`)
    console.error('Current window location:', window.location.href)
    
    // HTML5 audio error codes:
    // 1 = MEDIA_ERR_ABORTED - fetching process aborted by user
    // 2 = MEDIA_ERR_NETWORK - error occurred when downloading
    // 3 = MEDIA_ERR_DECODE - error occurred when decoding
    // 4 = MEDIA_ERR_SRC_NOT_SUPPORTED - audio/video not supported
    
    const errorCode = audioRef.current?.error?.code
    let errorMessage = 'Audio playback error'
    
    switch (errorCode) {
      case 1:
        errorMessage = 'Audio loading was aborted'
        break
      case 2:
        errorMessage = 'Network error while loading audio'
        break
      case 3:
        errorMessage = 'Error decoding audio file'
        break
      case 4:
        errorMessage = 'Audio format not supported or invalid src'
        // If the src is wrong, try to reset it
        if (audioRef.current && audioRef.current.src !== `/api/audio/stream/${fileId}`) {
          console.log('Detected wrong src, attempting to fix...')
          audioRef.current.src = `/api/audio/stream/${fileId}`
          audioRef.current.load()
          return // Don't set error yet, give it another chance
        }
        break
      default:
        errorMessage = `Audio error (code: ${errorCode})`
    }
    
    setLoading(false)
    setIsPlaying(false)
    setError(errorMessage)
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
