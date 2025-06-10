'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { Upload, Music, CheckCircle, AlertCircle, X } from 'lucide-react'

interface FileUploadProps {
  onFilesUploaded: (files: File[]) => void
}

interface UploadFile extends File {
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export default function FileUpload({ onFilesUploaded }: FileUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => {
      const uploadFile = Object.assign(file, {
        id: Math.random().toString(36).substring(7),
        progress: 0,
        status: 'pending' as const
      })
      return uploadFile
    })
    
    setUploadFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a']
    },
    multiple: true,
    maxSize: 50 * 1024 * 1024 // 50MB
  })

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(file => file.id !== id))
  }

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return
    
    setIsUploading(true)
    
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      
      uploadFiles.forEach(file => {
        formData.append('audio', file)
      })

      // Update files to uploading status
      setUploadFiles(prev => prev.map(file => ({
        ...file,
        status: 'uploading' as const,
        progress: 0
      })))

      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        setUploadFiles(prev => prev.map(file => ({
          ...file,
          status: 'success' as const,
          progress: 100
        })))
        
        onFilesUploaded(uploadFiles)
        
        // Clear files after successful upload
        setTimeout(() => {
          setUploadFiles([])
        }, 2000)
      } else {
        const error = await response.text()
        setUploadFiles(prev => prev.map(file => ({
          ...file,
          status: 'error' as const,
          error: error || 'Upload failed'
        })))
      }
    } catch (error) {
      setUploadFiles(prev => prev.map(file => ({
        ...file,
        status: 'error' as const,
        error: 'Network error'
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

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
            isDragActive
              ? 'border-primary-400 bg-primary-500/10'
              : 'border-gray-600 hover:border-primary-500 hover:bg-primary-500/5'
          }`}
        >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">
              {isDragActive ? 'Drop your music here!' : 'Upload your music'}
            </h3>
            <p className="text-gray-400">
              Drag & drop audio files here, or click to browse
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Supports MP3, WAV, FLAC, AAC, OGG, M4A (up to 50MB each)
            </p>
          </div>
        </div>
        </div>
      </motion.div>

      {/* File List */}
      {uploadFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold">Files to Upload</h4>
            <button
              onClick={handleUpload}
              disabled={isUploading || uploadFiles.some(f => f.status === 'success')}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Upload All'}
            </button>
          </div>

          <div className="space-y-2">
            {uploadFiles.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {file.status === 'pending' && (
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  
                  {file.status === 'uploading' && (
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-400">Uploading...</span>
                    </div>
                  )}
                  
                  {file.status === 'success' && (
                    <div className="flex items-center space-x-2 text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm">Uploaded</span>
                    </div>
                  )}
                  
                  {file.status === 'error' && (
                    <div className="flex items-center space-x-2 text-red-400">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm">{file.error || 'Failed'}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis Info */}
      <div className="bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border border-primary-500/20 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-2">AI Analysis Magic</h4>
            <p className="text-gray-300 mb-4">
              Once uploaded, our AI will analyze your music to extract:
            </p>
            <ul className="space-y-1 text-sm text-gray-400">
              <li>• Tempo and rhythm patterns</li>
              <li>• Harmonic complexity and key signatures</li>
              <li>• Energy levels and musical dynamics</li>
              <li>• Spectral characteristics and timbre</li>
              <li>• Musical compatibility factors</li>
            </ul>
            <p className="text-sm text-primary-400 mt-4">
              This analysis helps us find your perfect musical collaborators!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
