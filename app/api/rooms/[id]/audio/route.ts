import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { DatabaseService } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET all audio files for a room
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const tokenData = await verifyToken(token)
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const roomId = params.id

    // Check if user has access to this room
    const membership = await DatabaseService.checkRoomMembership(roomId, tokenData.id)
    if (!membership.isMember) {
      return NextResponse.json({ error: 'Access denied: Not a member of this room' }, { status: 403 })
    }

    // Get all audio files for this room
    const audioFiles = await DatabaseService.getRoomAudioFiles(roomId)
    
    // Convert to the format expected by OpenDAW
    const formattedFiles = audioFiles.map((file: any) => ({
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      filePath: file.filePath,
      fileSize: Number(file.fileSize),
      mimeType: file.mimeType,
      duration: Number(file.duration) || 0,
      sampleRate: file.sampleRate,
      channels: file.channels,
      format: file.format,
      metadata: file.metadata
    }))

    return NextResponse.json({
      success: true,
      audioFiles: formattedFiles,
      count: formattedFiles.length
    })
  } catch (error) {
    console.error('Error fetching room audio files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}