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

    console.log('AudioPlayer current location:', window.location.href)
    console.log('AudioPlayer will fetch:', `/api/audio/stream/${fileId}`)

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      if (!audioRef.current.src) {
        setLoading(true)
        try {
          const token = localStorage.getItem('token')
          console.log('Fetching audio stream for fileId:', fileId)
          
          // Use absolute URL to avoid base URL issues
          const streamUrl = `${window.location.origin}/api/audio/stream/${fileId}`
          console.log('Constructed stream URL:', streamUrl)
          
          const response = await fetch(streamUrl, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          console.log('Audio stream response:', response.status, response.statusText)
          console.log('Response content-type:', response.headers.get('content-type'))
          console.log('Response content-length:', response.headers.get('content-length'))
            if (response.ok) {
            // Always use blob approach for better compatibility
            const contentLength = parseInt(response.headers.get('content-length') || '0')
            console.log(`File size: ${(contentLength / 1024 / 1024).toFixed(2)} MB - using blob approach`)
            
            console.log('Starting blob conversion...')
            const blob = await response.blob()
            console.log('Blob created, size:', blob.size, 'type:', blob.type)
            const audioUrl = URL.createObjectURL(blob)
            console.log('Audio src set to blob URL:', audioUrl.substring(0, 50) + '...')
            console.log('Setting audioRef.current.src to:', audioUrl)
            
            // Double-check the blob URL before setting
            if (!audioUrl.startsWith('blob:')) {
              console.error('Invalid blob URL constructed:', audioUrl)
              setError('Failed to create audio blob')
              return
            }
            
            // Set src and load the audio
            audioRef.current.src = audioUrl
            audioRef.current.load()
            console.log('Audio element loaded with blob URL, final src:', audioRef.current.src)
            
            // Wait for audio to be ready, then play
            try {
              console.log('Audio loaded, attempting to play...')
              console.log('Audio element state before play:', {
                src: audioRef.current.src,
                readyState: audioRef.current.readyState,
                networkState: audioRef.current.networkState,
                error: audioRef.current.error
              })
              
              // Wait a bit for the audio to be ready
              if (audioRef.current.readyState < 2) { // HAVE_CURRENT_DATA
                console.log('Audio not ready yet, waiting for canplay event')
                await new Promise((resolve, reject) => {
                  const timeoutId = setTimeout(() => {
                    reject(new Error('Audio load timeout'))
                  }, 10000) // 10 second timeout
                  
                  const onCanPlay = () => {
                    clearTimeout(timeoutId)
                    audioRef.current?.removeEventListener('canplay', onCanPlay)
                    audioRef.current?.removeEventListener('error', onError)
                    console.log('Audio ready state achieved:', audioRef.current?.readyState)
                    resolve(true)
                  }
                  
                  const onError = (e: Event) => {
                    clearTimeout(timeoutId)
                    audioRef.current?.removeEventListener('canplay', onCanPlay)
                    audioRef.current?.removeEventListener('error', onError)
                    console.error('Audio load error:', e)
                    reject(new Error('Audio load failed'))
                  }
                  
                  audioRef.current?.addEventListener('canplay', onCanPlay)
                  audioRef.current?.addEventListener('error', onError)
                })
              }
              
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
    const audio = e.currentTarget
    console.error('Audio error event:', e)
    console.error('Audio error details:', {
      error: audio.error,
      networkState: audio.networkState,
      readyState: audio.readyState,
      src: audio.src,
      fileId: fileId,
      currentLocation: window.location.href
    })
    
    // Check if the src got corrupted to the current page URL
    if (audio.src === window.location.href) {
      console.error('CRITICAL: Audio src was set to current page URL instead of API endpoint!')
      console.error('This indicates a relative URL resolution issue')
    }
    
    if (audio.error) {
      console.error('Audio error code:', audio.error.code)
      console.error('Audio error message:', audio.error.message)
    }
    
    setLoading(false)
    setIsPlaying(false)
    setError(`Audio playback error (Code: ${audio.error?.code || 'unknown'})`)
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
