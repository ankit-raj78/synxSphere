import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Parse request body
    const { fileId, roomId } = await request.json()

    if (!fileId || !roomId) {
      return NextResponse.json({ error: 'File ID and Room ID are required' }, { status: 400 })
    }

    // Verify the user owns the file
    const audioFile = await prisma.audioFile.findFirst({
      where: {
        id: fileId,
        userId: user.id
      }
    })

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file not found or access denied' }, { status: 404 })
    }

    // Verify the user has access to the room (either creator or participant)
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        OR: [
          { creatorId: user.id }, // User is the creator
          {
            participants: {
              some: { userId: user.id }
            }
          } // User is a participant
        ]
      }
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 })
    }

    // Check if file is already in a room
    if (audioFile.roomId) {
      return NextResponse.json({ 
        error: 'File is already associated with a room',
        currentRoomId: audioFile.roomId 
      }, { status: 400 })
    }

    // Move the file to the room
    const updatedFile = await prisma.audioFile.update({
      where: { id: fileId },
      data: { roomId: roomId }
    })

    return NextResponse.json({
      success: true,
      message: 'File moved to room successfully',
      file: {
        id: updatedFile.id,
        originalName: updatedFile.originalName,
        roomId: updatedFile.roomId
      }
    })

  } catch (error) {
    console.error('Error moving file to room:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
