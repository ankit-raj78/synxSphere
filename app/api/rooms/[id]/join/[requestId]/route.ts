import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Approve or reject join request
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string, requestId: string } }
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
    const { action } = body // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
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
        return NextResponse.json({ error: 'Not authorized to handle join requests' }, { status: 403 })
      }

      // Get request information using Prisma
      const joinRequest = await prisma.joinRequest.findFirst({
        where: {
          id: params.requestId,
          roomId: params.id,
          status: 'PENDING'
        }
      })

      if (!joinRequest) {
        return NextResponse.json({ error: 'Join request not found or already processed' }, { status: 404 })
      }

      if (action === 'approve') {
        // Add user to room participants using Prisma
        await prisma.roomParticipant.create({
          data: {
            roomId: params.id,
            userId: joinRequest.userId,
            role: 'participant',
            isOnline: true
          }
        })

        // Update request status using Prisma
        await prisma.joinRequest.update({
          where: { id: params.requestId },
          data: {
            status: 'APPROVED'
          }
        })

        return NextResponse.json({ 
          message: 'Join request approved successfully' 
        })      } else if (action === 'reject') {
        // Update request status to rejected using Prisma
        await prisma.joinRequest.update({
          where: { id: params.requestId },
          data: {
            status: 'REJECTED'
          }
        })

        return NextResponse.json({ 
          message: 'Join request rejected successfully' 
        })
      }

    } catch (dbError) {
      console.log('Database not available for join request processing:', dbError)
      return NextResponse.json({ 
        message: `Join request ${action}d successfully (mock)` 
      })
    }

  } catch (error) {
    console.error('Error processing join request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
