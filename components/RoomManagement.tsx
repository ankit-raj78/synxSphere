'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, CheckCircle } from 'lucide-react'
import { deleteRoomWithConfirmation, formatDeletionSummary, RoomDeletionSummary } from '@/lib/room-management'

interface Room {
  id: string
  name: string
  description: string
  genre: string
  participantCount: number
  maxParticipants: number
  isLive: boolean
  creator: string
  createdAt: string | Date
}

interface RoomManagementProps {
  room: Room
  token: string
  onRoomDeleted?: (roomId: string, summary: RoomDeletionSummary) => void
  isCreator?: boolean
}

export default function RoomManagement({ 
  room, 
  token, 
  onRoomDeleted, 
  isCreator = false 
}: RoomManagementProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const handleDeleteRoom = async () => {
    if (isDeleting) return

    setIsDeleting(true)
    
    try {
      const result = await deleteRoomWithConfirmation(
        room.id,
        room.name,
        token,
        (summary) => {
          // Call the parent callback
          if (onRoomDeleted) {
            onRoomDeleted(room.id, summary)
          }
        }
      )

      if (result) {
        console.log('🎉 Room deletion completed:', result.deletionSummary)
      }

    } catch (error) {
      console.error('❌ Room deletion failed:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Format the creation date
  const createdDate = new Date(room.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Room Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {room.name}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            {room.description}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="bg-gray-100 px-2 py-1 rounded">
              {room.genre}
            </span>
            <span>
              {room.participantCount}/{room.maxParticipants} participants
            </span>
            <span className={`flex items-center gap-1 ${room.isLive ? 'text-green-600' : 'text-gray-500'}`}>
              <div className={`w-2 h-2 rounded-full ${room.isLive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              {room.isLive ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
        
        {/* Delete Button - Only show for creators */}
        {isCreator && (
          <button
            onClick={handleDeleteRoom}
            disabled={isDeleting}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium
              transition-colors duration-200
              ${isDeleting 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800'
              }
            `}
            title="Delete room and all associated data"
          >
            <Trash2 size={16} />
            {isDeleting ? 'Deleting...' : 'Delete Room'}
          </button>
        )}
      </div>

      {/* Room Details Toggle */}
      <div className="border-t border-gray-100 pt-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>

        {showDetails && (
          <div className="mt-3 space-y-2 text-sm text-gray-600">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700">Room ID:</span>
                <br />
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                  {room.id}
                </code>
              </div>
              <div>
                <span className="font-medium text-gray-700">Creator:</span>
                <br />
                {room.creator}
              </div>
              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <br />
                {createdDate}
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <br />
                <span className={`inline-flex items-center gap-1 ${room.isLive ? 'text-green-600' : 'text-gray-500'}`}>
                  {room.isLive ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  {room.isLive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Warning for creators */}
      {isCreator && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Room Creator Privileges</p>
              <p className="text-xs text-yellow-700">
                As the room creator, you can delete this room. This will permanently remove all audio files, 
                studio projects, and collaboration data. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Export types for use in other components
export type { Room, RoomManagementProps }