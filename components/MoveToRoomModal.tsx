'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, Music, ArrowRight, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

interface Room {
  id: string
  name: string
  description?: string
  genre?: string
  participant_count: number
  is_live: boolean
  creator_name?: string
}

interface MoveToRoomModalProps {
  isOpen: boolean
  onClose: () => void
  audioFile: {
    id: string
    originalName: string
  }
  onFileMoved: (fileId: string, roomId: string) => void
}

export default function MoveToRoomModal({ 
  isOpen, 
  onClose, 
  audioFile, 
  onFileMoved 
}: MoveToRoomModalProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [moving, setMoving] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadUserRooms()
    }
  }, [isOpen])

  const loadUserRooms = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/rooms', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Combine created and joined rooms
        const allRooms = [
          ...(data.created_rooms || []),
          ...(data.joined_rooms || [])
        ]
        setRooms(allRooms)
      } else {
        toast.error('Failed to load rooms')
      }
    } catch (error) {
      console.error('Error loading rooms:', error)
      toast.error('Error loading rooms')
    } finally {
      setLoading(false)
    }
  }

  const handleMoveToRoom = async (roomId: string) => {
    if (!roomId) return

    setMoving(true)
    setSelectedRoomId(roomId)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/audio/move-to-room', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: audioFile.id,
          roomId: roomId
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(`File moved to room successfully!`)
        onFileMoved(audioFile.id, roomId)
        onClose()
      } else {
        toast.error(result.error || 'Failed to move file to room')
      }
    } catch (error) {
      console.error('Error moving file to room:', error)
      toast.error('Error moving file to room')
    } finally {
      setMoving(false)
      setSelectedRoomId(null)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div>
                  <h2 className="text-xl font-bold text-white">Move to Room</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Move "{audioFile.originalName}" to a collaboration room
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-6 h-6 animate-spin text-primary-500" />
                    <span className="ml-2 text-gray-400">Loading rooms...</span>
                  </div>
                ) : rooms.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No rooms available</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Create or join a room to move files there
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {rooms.map((room) => (
                      <motion.button
                        key={room.id}
                        onClick={() => handleMoveToRoom(room.id)}
                        disabled={moving}
                        className={`
                          w-full p-4 text-left rounded-lg border transition-all
                          ${moving && selectedRoomId === room.id
                            ? 'bg-primary-600/20 border-primary-500/50'
                            : 'bg-gray-700/50 border-gray-600 hover:border-primary-500/50 hover:bg-gray-700'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                        whileHover={{ scale: moving ? 1 : 1.02 }}
                        whileTap={{ scale: moving ? 1 : 0.98 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-medium text-white">{room.name}</h3>
                              {room.is_live && (
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-400">
                              <span>{room.genre || 'No genre'}</span>
                              <span>•</span>
                              <span className="flex items-center space-x-1">
                                <Users className="w-3 h-3" />
                                <span>{room.participant_count} participants</span>
                              </span>
                              {room.creator_name && (
                                <>
                                  <span>•</span>
                                  <span>by {room.creator_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {moving && selectedRoomId === room.id ? (
                              <Loader className="w-4 h-4 animate-spin text-primary-400" />
                            ) : (
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-800/50">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Music className="w-4 h-4" />
                  <span>Files moved to rooms become available for collaboration</span>
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
