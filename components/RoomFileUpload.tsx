'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Music, X, Check, Play, Pause, Clock, User } from 'lucide-react'

interface MusicFile {
  id: string
  filename: string
  original_name: string
  file_path: string
  duration: number
  created_at: string
  uploader_name?: string
  user_id: string
}

interface RoomFileUploadProps {
  roomId: string
  onFilesUploaded: (files: any[]) => void
  onClose: () => void
}

export default function RoomFileUpload({ roomId, onFilesUploaded, onClose }: RoomFileUploadProps) {
  const [activeTab, setActiveTab] = useState<'existing' | 'upload'>('existing')
  const [existingFiles, setExistingFiles] = useState<MusicFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [playingFile, setPlayingFile] = useState<string | null>(null)
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetchExistingFiles()
  }, [])

  const fetchExistingFiles = async () => {
    try {
      setLoadingExisting(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/audio/files', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const files = await response.json()
        setExistingFiles(files)
      }
    } catch (error) {
      console.error('Error fetching existing files:', error)
    } finally {
      setLoadingExisting(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setUploadFiles(files)
  }

  const toggleExistingFile = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  const playPreview = async (fileId: string) => {
    if (playingFile === fileId) {
      // Stop playing
      if (audioRef) {
        audioRef.pause()
        setAudioRef(null)
      }
      setPlayingFile(null)
    } else {
      // Start playing
      if (audioRef) {
        audioRef.pause()
      }
      
      try {
        const token = localStorage.getItem('token')
        
        // Use the file ID to stream audio
        const audio = new Audio(`/api/audio/stream/${fileId}?auth=${token}`)
        
        audio.play()
        audio.onended = () => {
          setPlayingFile(null)
          setAudioRef(null)
        }
        audio.onerror = () => {
          console.error('Error playing audio file')
          setPlayingFile(null)
          setAudioRef(null)
          alert('Unable to play this audio file')
        }
        
        setAudioRef(audio)
        setPlayingFile(fileId)
      } catch (error) {
        console.error('Error setting up audio:', error)
        alert('Unable to play this audio file')
        setPlayingFile(null)
        setAudioRef(null)
      }
    }
  }

  const handleAddExistingFiles = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file to add to the room')
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      // Update the selected files to associate them with this room
      const promises = selectedFiles.map(async (fileId) => {
        const response = await fetch(`/api/audio/files/${fileId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            room_id: roomId
          })
        })
        
        if (!response.ok) {
          throw new Error(`Failed to add file ${fileId} to room`)
        }
        
        return response.json()
      })

      await Promise.all(promises)
      
      // Notify parent component
      onFilesUploaded(selectedFiles)
      onClose()
    } catch (error) {
      console.error('Error adding files to room:', error)
      alert('Failed to add files to room')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadNewFiles = async () => {
    if (uploadFiles.length === 0) {
      alert('Please select files to upload')
      return
    }

    try {
      setUploading(true)
      const token = localStorage.getItem('token')
      
      const formData = new FormData()
      uploadFiles.forEach((file, index) => {
        formData.append(`files`, file)
      })
      formData.append('roomId', roomId)

      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        onFilesUploaded(result.files)
        onClose()
      } else {
        const error = await response.json()
        alert(`Upload failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Error uploading files:', error)
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-900 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Add Music to Room</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('existing')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'existing'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Music className="w-4 h-4 inline mr-2" />
            Your Music Library
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'upload'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Upload New Files
          </button>
        </div>        <div className="flex-1 overflow-y-auto min-h-0">
          <AnimatePresence mode="wait">
            {activeTab === 'existing' ? (
              <motion.div
                key="existing"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {loadingExisting ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                  </div>
                ) : existingFiles.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No music files found in your library</p>
                    <p className="text-sm">Upload some music first from the dashboard</p>
                  </div>
                ) : (
                  existingFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        selectedFiles.includes(file.id)
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                      onClick={() => toggleExistingFile(file.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              selectedFiles.includes(file.id)
                                ? 'border-purple-500 bg-purple-500'
                                : 'border-gray-600'
                            }`}>
                              {selectedFiles.includes(file.id) && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-medium">{file.original_name}</h3>
                              <div className="flex items-center space-x-4 text-sm text-gray-400">
                                {file.duration && (
                                  <span className="flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {formatDuration(file.duration)}
                                  </span>
                                )}
                                <span>
                                  {new Date(file.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            playPreview(file.id)
                          }}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          {playingFile === file.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >                <div className="border-2 border-dashed border-gray-600 hover:border-purple-500 rounded-lg p-8 text-center transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer block">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">Upload Audio Files</p>
                    <p className="text-gray-400">
                      Drag and drop files here, or click to select
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Supports MP3, WAV, FLAC, and other audio formats
                    </p>
                    <div className="mt-4">
                      <div className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
                        <Upload className="w-4 h-4 mr-2" />
                        Choose Files
                      </div>
                    </div>
                  </label>
                </div>                {uploadFiles.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium">Selected Files:</h3>
                    {uploadFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          onClick={() => {
                            setUploadFiles(prev => prev.filter((_, i) => i !== index))
                          }}
                          className="p-1 hover:bg-gray-700 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {uploadFiles.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-sm">
                      👆 Click the area above to select audio files to upload
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          {activeTab === 'existing' ? (            <button
              onClick={handleAddExistingFiles}
              disabled={selectedFiles.length === 0 || loading}
              className="px-8 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
            >
              {loading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Adding to Room...
                </span>
              ) : (
                <span className="flex items-center">
                  <Music className="w-5 h-5 mr-2" />
                  Add {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''} to Room
                </span>
              )}
            </button>
          ) : (            <button
              onClick={handleUploadNewFiles}
              disabled={uploadFiles.length === 0 || uploading}
              className="px-8 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
            >
              {uploading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Uploading...
                </span>
              ) : (
                <span className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Upload {uploadFiles.length} File{uploadFiles.length !== 1 ? 's' : ''}
                </span>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
