import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// Mark route as dynamic since it requires request headers
export const dynamic = 'force-dynamic'

// Mark route as server-side only
export const runtime = 'nodejs'

export async function PATCH(
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

    const fileId = params.id
    const body = await request.json()
    const { room_id } = body

    // Verify the user owns this file using Prisma
    const audioFile = await prisma.audioFile.findFirst({
      where: {
        id: fileId,
        userId: user.id
      }
    })
    
    if (!audioFile) {
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 })
    }

    // If room_id is provided, verify user is a member of that room using Prisma
    if (room_id) {
      const membership = await prisma.roomParticipant.findFirst({
        where: {
          roomId: room_id,
          userId: user.id
        }
      })
      
      if (!membership) {
        return NextResponse.json({ error: 'Access denied: Not a member of this room' }, { status: 403 })
      }
    }

    // Update the file's room association using Prisma
    const updatedFile = await prisma.audioFile.update({
      where: {
        id: fileId
      },
      data: {
        roomId: room_id
      }
    })
    
    return NextResponse.json(updatedFile)
  } catch (error) {
    console.error('Error updating file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
