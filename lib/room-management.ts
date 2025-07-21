// Room management utilities
import { toast } from 'react-hot-toast'

export interface RoomDeletionSummary {
  roomId: string
  roomName: string
  audioFilesDeleted: number
  studioProjectsDeleted: number
  participantsRemoved: number
  collaborationLogsDeleted: number
  compositionsDeleted: number
}

export interface DeleteRoomResponse {
  success: boolean
  message: string
  deletionSummary: RoomDeletionSummary
}

/**
 * Delete a room and all its associated data
 * @param roomId - The ID of the room to delete
 * @param token - Authentication token
 * @returns Promise with deletion result
 */
export async function deleteRoom(roomId: string, token: string): Promise<DeleteRoomResponse> {
  try {
    console.log(`🗑️ Initiating room deletion for ${roomId}...`)
    
    const response = await fetch(`/api/rooms/${roomId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    console.log(`✅ Room deletion successful:`, data.deletionSummary)
    return data

  } catch (error) {
    console.error('❌ Room deletion failed:', error)
    throw error
  }
}

/**
 * Delete a room with user confirmation and toast notifications
 * @param roomId - The ID of the room to delete
 * @param roomName - The name of the room (for confirmation)
 * @param token - Authentication token
 * @param onSuccess - Callback function called on successful deletion
 * @returns Promise with deletion result or null if cancelled
 */
export async function deleteRoomWithConfirmation(
  roomId: string, 
  roomName: string, 
  token: string,
  onSuccess?: (summary: RoomDeletionSummary) => void
): Promise<DeleteRoomResponse | null> {
  
  // Show confirmation dialog
  const confirmed = window.confirm(
    `Are you sure you want to delete the room "${roomName}"?\n\n` +
    `This will permanently delete:\n` +
    `• All audio files in the room\n` +
    `• Studio project data\n` +
    `• Collaboration history\n` +
    `• All compositions\n` +
    `• Room participants\n\n` +
    `This action cannot be undone!`
  )

  if (!confirmed) {
    console.log('🚫 Room deletion cancelled by user')
    return null
  }

  // Show loading toast
  const loadingToast = toast.loading(`Deleting room "${roomName}"...`)

  try {
    const result = await deleteRoom(roomId, token)
    
    // Show success toast with details
    toast.success(
      `Room "${roomName}" deleted successfully!\n` +
      `Deleted: ${result.deletionSummary.audioFilesDeleted} audio files, ` +
      `${result.deletionSummary.studioProjectsDeleted} studio projects, ` +
      `${result.deletionSummary.participantsRemoved} participants`,
      { 
        duration: 5000,
        id: loadingToast 
      }
    )

    // Call success callback if provided
    if (onSuccess) {
      onSuccess(result.deletionSummary)
    }

    return result

  } catch (error) {
    // Show error toast
    toast.error(
      `Failed to delete room "${roomName}": ${error.message}`,
      { 
        duration: 8000,
        id: loadingToast 
      }
    )
    throw error
  }
}

/**
 * Format deletion summary for display
 * @param summary - The deletion summary object
 * @returns Formatted string describing what was deleted
 */
export function formatDeletionSummary(summary: RoomDeletionSummary): string {
  const parts = []
  
  if (summary.audioFilesDeleted > 0) {
    parts.push(`${summary.audioFilesDeleted} audio file${summary.audioFilesDeleted !== 1 ? 's' : ''}`)
  }
  
  if (summary.studioProjectsDeleted > 0) {
    parts.push(`${summary.studioProjectsDeleted} studio project${summary.studioProjectsDeleted !== 1 ? 's' : ''}`)
  }
  
  if (summary.compositionsDeleted > 0) {
    parts.push(`${summary.compositionsDeleted} composition${summary.compositionsDeleted !== 1 ? 's' : ''}`)
  }
  
  if (summary.participantsRemoved > 0) {
    parts.push(`${summary.participantsRemoved} participant${summary.participantsRemoved !== 1 ? 's' : ''}`)
  }
  
  if (summary.collaborationLogsDeleted > 0) {
    parts.push(`${summary.collaborationLogsDeleted} collaboration log${summary.collaborationLogsDeleted !== 1 ? 's' : ''}`)
  }

  if (parts.length === 0) {
    return 'No associated data found to delete'
  }
  
  if (parts.length === 1) {
    return parts[0]
  }
  
  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`
  }
  
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
}