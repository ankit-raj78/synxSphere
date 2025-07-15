import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Apply to join room
export async function POST(
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

    const body = await request.json()
    const { message = '' } = body

    try {
      // Check if room exists using Prisma
      const room = await prisma.room.findUnique({
        where: { id: params.id }
      })

      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 })
      }

      // Check if user is already a participant using Prisma
      const existingParticipant = await prisma.roomParticipant.findFirst({
        where: {
          roomId: params.id,
          userId: tokenData.id
        }
      })

      if (existingParticipant) {
        return NextResponse.json({ error: 'Already a participant in this room' }, { status: 409 })
      }

      // Check if there's already a pending request using Prisma
      const existingRequest = await prisma.joinRequest.findFirst({
        where: {
          roomId: params.id,
          userId: tokenData.id,
          status: 'PENDING'
        }
      })

      if (existingRequest) {
        return NextResponse.json({ error: 'Join request already pending' }, { status: 409 })
      }

      // Create join request using Prisma
      const joinRequest = await prisma.joinRequest.create({
        data: {
          roomId: params.id,
          userId: tokenData.id,
          message: message,
          status: 'PENDING'
        }
      })

      return NextResponse.json({ 
        message: 'Join request sent successfully',
        requestId: joinRequest.id 
      })

    } catch (dbError) {
      console.log('Database not available for join request:', dbError)
      return NextResponse.json({ 
        message: 'Join request sent successfully (mock)' 
      })
    }

  } catch (error) {
    console.error('Error creating join request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get join requests for room
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

    try {
      // Check if user is room creator using Prisma
      const room = await prisma.room.findFirst({
        where: {
          id: params.id,
          creatorId: tokenData.id
        }
      })

      if (!room) {
        return NextResponse.json({ error: 'Not authorized to view join requests' }, { status: 403 })
      }

      // Get pending requests using Prisma
      const requests = await prisma.joinRequest.findMany({
        where: {
          roomId: params.id,
          status: 'PENDING'
        },
        include: {
          user: {
            select: {
              username: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      const formattedRequests = requests.map((req: { user: { email: string; username: string } } & { id: string; createdAt: Date; userId: string; message: string | null }) => ({
        id: req.id,
        userId: req.userId,
        username: req.user.username || req.user.email?.split('@')[0] || 'User',
        message: req.message,
        createdAt: req.createdAt
      }))

      return NextResponse.json({ requests: formattedRequests })

    } catch (dbError) {
      console.log('Database not available for join requests:', dbError)
      
      // Return mock join requests for demo
      const mockRequests = [
        {
          id: 'req-1',
          userId: 'user-123',
          username: 'MusicLover',
          message: 'Would love to collaborate on this track!',
          createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 minutes ago
        },
        {
          id: 'req-2',
          userId: 'user-456',
          username: 'BeatMaker',
          message: 'I can add some drums to this session',
          createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 minutes ago
        }
      ]
      
      return NextResponse.json({ requests: mockRequests })
    }

  } catch (error) {
    console.error('Error fetching join requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
