'use client'

import { useState, useRef } from 'react'
import { Play, Pause } from 'lucide-react'

interface SimpleAudioPlayerProps {
  fileId: string
  className?: string
}

export default function SimpleAudioPlayer({ fileId, className = '' }: SimpleAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)

  const addDebug = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(message)
  }

  const togglePlay = async () => {
    if (!audioRef.current) return

    setError(null)
    addDebug(`🎵 Starting play for fileId: ${fileId}`)

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      addDebug('⏸️ Audio paused')
    } else {
      if (!audioRef.current.src) {
        setLoading(true)
        addDebug('📡 Starting audio download...')
        
        try {
          const token = localStorage.getItem('token')
          addDebug(`🔑 Token available: ${!!token}`)
          
          if (!token) {
            throw new Error('No authentication token found')
          }

          addDebug(`🌐 Fetching: /api/audio/stream/${fileId}`)
          
          // Use AbortController to handle timeout
          const controller = new AbortController()
          const timeoutId = setTimeout(() => {
            controller.abort()
            addDebug('⏰ Request timeout after 15 seconds')
          }, 15000)

          const response = await fetch(`/api/audio/stream/${fileId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'audio/*'
            },
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          addDebug(`📥 Response: ${response.status} ${response.statusText}`)
          addDebug(`📋 Content-Type: ${response.headers.get('content-type')}`)
          addDebug(`📏 Content-Length: ${response.headers.get('content-length')} bytes`)
            if (!response.ok) {
            const errorText = await response.text()
            addDebug(`❌ Server error: ${errorText}`)
            throw new Error(`Server responded with ${response.status}: ${errorText}`)
          }

          // For large files, use response URL directly instead of converting to Blob
          const contentLength = parseInt(response.headers.get('content-length') || '0')
          if (contentLength > 20 * 1024 * 1024) { // Use direct URL for files larger than 20MB
            addDebug(`📁 Large file detected (${contentLength} bytes), using direct streaming`)
            
            // Set API URL directly, let browser handle streaming
            const directUrl = `/api/audio/stream/${fileId}?auth=${encodeURIComponent(token)}`
            audioRef.current.src = directUrl
            audioRef.current.load()
            addDebug('📻 Audio element loaded with direct URL')
          } else {
            addDebug('🔄 Converting response to blob...')
            const blob = await response.blob()
            addDebug(`✅ Blob created: ${blob.size} bytes, type: ${blob.type}`)
            
            const audioUrl = URL.createObjectURL(blob)
            addDebug(`🔗 Object URL created: ${audioUrl.substring(0, 50)}...`)
            
            audioRef.current.src = audioUrl
            audioRef.current.load()
            addDebug('📻 Audio element loaded with blob URL')
          }
          
          try {
            await audioRef.current.play()
            setIsPlaying(true)
            addDebug('🎶 Audio playback started successfully!')
          } catch (playError) {
            addDebug(`❌ Play error: ${(playError as Error).message}`)
            if ((playError as Error).name === 'NotAllowedError') {
              setError('Browser blocked autoplay - try clicking play again')
            } else {
              setError(`Playback failed: ${(playError as Error).message}`)
            }
          }
          
        } catch (error) {
          addDebug(`💥 Network error: ${(error as Error).message}`)
          if ((error as Error).name === 'AbortError') {
            setError('Request timeout - file too large or server too slow')
          } else {
            setError(`Failed to load audio: ${(error as Error).message}`)
          }
        } finally {
          setLoading(false)
        }
      } else {
        // Audio already loaded
        try {
          await audioRef.current.play()
          setIsPlaying(true)
          addDebug('🎶 Resumed existing audio')
        } catch (error) {
          addDebug(`❌ Resume error: ${(error as Error).message}`)
          setError(`Cannot resume: ${(error as Error).message}`)
        }
      }
    }
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center space-x-2 mb-2">
        <audio
          ref={audioRef}
          onPlay={() => {
            setIsPlaying(true)
            addDebug('🎵 Audio play event fired')
          }}
          onPause={() => {
            setIsPlaying(false)
            addDebug('⏸️ Audio pause event fired')
          }}          onError={(e) => {
            const target = e.target as HTMLAudioElement
            addDebug(`❌ Audio element error: ${target.error?.message || 'Unknown'}`)
            setError('Audio element error')
          }}
          onLoadedData={() => addDebug('📊 Audio data loaded')}
          onCanPlay={() => addDebug('✅ Audio can start playing')}
        />
        
        <button
          onClick={togglePlay}
          disabled={loading}
          className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 rounded-full transition-colors disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" />
          )}
        </button>
        
        {error && (
          <span className="text-red-400 text-sm">{error}</span>
        )}
      </div>
      
      {/* Debug info */}
      <div className="mt-2 p-2 bg-gray-800 rounded text-xs font-mono max-h-40 overflow-y-auto">
        <div className="text-gray-400 mb-1">Debug Log:</div>
        {debugInfo.map((info, index) => (
          <div key={index} className="text-gray-300">{info}</div>
        ))}
      </div>
    </div>
  )
}
