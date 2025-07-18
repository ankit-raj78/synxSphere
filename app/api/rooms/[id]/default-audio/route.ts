import { NextRequest, NextResponse } from 'next/server'

// This route requires authentication and should not be statically generated
export const dynamic = 'force-dynamic'
import { verifyToken } from '@/lib/auth'
import { DatabaseService } from '@/lib/prisma'

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

    // Get the room's default audio file
    const defaultAudioFile = await DatabaseService.getRoomDefaultAudioFile(roomId)
    
    if (!defaultAudioFile) {
      return NextResponse.json({ error: 'No default audio file found for this room' }, { status: 404 })
    }

    // Return the default audio file with project data
    const response = {
      id: defaultAudioFile.id,
      filename: defaultAudioFile.filename,
      originalName: defaultAudioFile.originalName,
      roomId: defaultAudioFile.roomId,
      metadata: defaultAudioFile.metadata,
      createdAt: defaultAudioFile.createdAt,
      updatedAt: defaultAudioFile.updatedAt
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching room default audio file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}