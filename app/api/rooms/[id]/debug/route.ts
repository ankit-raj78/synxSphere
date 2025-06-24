import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const roomId = params.id

    // Get room info with Prisma
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });
    
    // Get room participants with user details
    const participants = await prisma.roomParticipant.findMany({
      where: { roomId: roomId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });
    
    // Get room files - files uploaded by room participants or associated with the room
    const files = await prisma.audioFile.findMany({
      where: {
        OR: [
          { roomId: roomId },
          {
            userId: {
              in: participants.map(p => p.userId)
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Check current user membership
    const currentUserMembership = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId: roomId,
          userId: user.id
        }
      }
    });
    
    return NextResponse.json({
      room: room,
      participants: participants.map(p => ({
        ...p,
        username: p.user.username,
        email: p.user.email
      })),
      files: files.map(f => ({
        ...f,
        uploader_name: f.user.username
      })),
      currentUserMembership: currentUserMembership,
      currentUserId: user.id
    })
  } catch (error) {
    console.error('Error debugging room:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
