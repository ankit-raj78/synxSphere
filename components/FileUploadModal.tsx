'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, CheckCircle, AlertCircle, Music, FileAudio, Plus } from 'lucide-react'

interface FileUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (files: File[]) => Promise<void>
  roomId: string
  maxFiles?: number
  acceptedFormats?: string[]
}

interface UploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  id: string
  errorMessage?: string
}

export default function FileUploadModal({ 
  isOpen, 
  onClose, 
  onUpload, 
  roomId,
  maxFiles = 10,
  acceptedFormats = ['.wav', '.mp3', '.flac', '.aac', '.m4a', '.ogg']
}: FileUploadModalProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }

  const handleFiles = async (files: File[]) => {
    // Filter for audio files
    const audioFiles = files.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      const mimeType = file.type
      console.log('Checking file:', file.name, 'extension:', extension, 'mimeType:', mimeType)
      
      // Check both file extension and MIME type
      return acceptedFormats.includes(extension) || mimeType.startsWith('audio/')
    })

    if (audioFiles.length === 0) {
      const selectedExtensions = files.map(f => '.' + f.name.split('.').pop()?.toLowerCase()).join(', ')
      alert(`Please select valid audio files. Selected files have extensions: ${selectedExtensions}. Supported: ${acceptedFormats.join(', ')}`)
      return
    }

    if (audioFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`)
      return
    }

    setIsUploading(true)
    
    // Initialize upload progress
    const initialUploads: UploadProgress[] = audioFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
      id: Math.random().toString(36).substr(2, 9)
    }))
    
    setUploads(initialUploads)

    try {
      // Simulate upload progress for each file
      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i]
        const uploadId = initialUploads[i].id

        // Simulate progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100))
          setUploads(prev => prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, progress }
              : upload
          ))
        }

        // Mark as complete
        setUploads(prev => prev.map(upload => 
          upload.id === uploadId 
            ? { ...upload, status: 'success', progress: 100 }
            : upload
        ))
      }

      // Call the parent upload handler
      await onUpload(audioFiles)
      
      // Close modal after successful upload
      setTimeout(() => {
        onClose()
        setUploads([])
      }, 1000)

    } catch (error) {
      console.error('Upload failed:', error)
      setUploads(prev => prev.map(upload => ({
        ...upload,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Upload failed'
      })))
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'wav':
      case 'flac':
      case 'aiff':
        return <FileAudio className="w-6 h-6 text-blue-400" />
      case 'mp3':
      case 'aac':
      case 'm4a':
        return <Music className="w-6 h-6 text-green-400" />
      case 'ogg':
      case 'wma':
        return <FileAudio className="w-6 h-6 text-purple-400" />
      default:
        return <FileAudio className="w-6 h-6 text-gray-400" />
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Upload Audio Files</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {uploads.length === 0 ? (
              /* Drop Zone */
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-purple-400 bg-purple-500/10' 
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Drop your audio files here
                </h3>
                <p className="text-gray-400 mb-4">
                  or click to browse your files
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white font-medium"
                >
                  Choose Files
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  Supported formats: {acceptedFormats.join(', ')} • Max {maxFiles} files
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={acceptedFormats.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              /* Upload Progress */
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {uploads.map((upload) => (
                  <motion.div
                    key={upload.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800 rounded-lg p-4"
                  >
                    <div className="flex items-center space-x-3">
                      {getFileIcon(upload.file.name)}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {upload.file.name}
                        </p>
                        <p className="text-sm text-gray-400">
                          {formatFileSize(upload.file.size)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {upload.status === 'uploading' && (
                          <div className="text-sm text-gray-400">
                            {upload.progress}%
                          </div>
                        )}
                        {upload.status === 'success' && (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        )}
                        {upload.status === 'error' && (
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full transition-colors ${
                            upload.status === 'success' 
                              ? 'bg-green-500' 
                              : upload.status === 'error'
                              ? 'bg-red-500'
                              : 'bg-purple-500'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${upload.progress}%` }}
                          transition={{ duration: 0.2 }}
                        />
                      </div>
                    </div>

                    {/* Error Message */}
                    {upload.status === 'error' && upload.errorMessage && (
                      <p className="text-sm text-red-400 mt-2">
                        {upload.errorMessage}
                      </p>
                    )}
                  </motion.div>
                ))}

                {/* Upload Another */}
                {!isUploading && uploads.every(u => u.status !== 'uploading') && (
                  <button
                    onClick={() => {
                      setUploads([])
                      fileInputRef.current?.click()
                    }}
                    className="w-full p-4 border-2 border-dashed border-gray-600 hover:border-gray-500 rounded-lg transition-colors text-gray-400 hover:text-white"
                  >
                    <Plus className="w-6 h-6 mx-auto mb-2" />
                    Upload More Files
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Room: {roomId}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
                disabled={isUploading}
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
