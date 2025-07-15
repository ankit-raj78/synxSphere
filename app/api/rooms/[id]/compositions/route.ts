import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// Mark route as dynamic since it requires request headers
export const dynamic = 'force-dynamic'

// Mark route as server-side only
export const runtime = 'nodejs'

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

    // Verify user is a member of this room using Prisma
    const membership = await prisma.roomParticipant.findFirst({
      where: {
        roomId: roomId,
        userId: user.id
      },
      include: {
        room: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
    
    if (!membership) {
      return NextResponse.json({ error: 'Access denied: Not a member of this room' }, { status: 403 })
    }

    // Get all compositions created in this room by all participants using Prisma
    const compositions = await prisma.composition.findMany({
      where: {
        roomId: roomId
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
    })
    
    // Format response to match expected structure
    const formattedCompositions = compositions.map((comp: { id: string; title: string; filePath: string; fileSize: bigint; isPublic: boolean; createdAt: Date; mixSettings: any; user: { username: string } }) => ({
      ...comp,
      composer_name: comp.user.username
    }))
    
    return NextResponse.json(formattedCompositions)
  } catch (error) {
    console.error('Error fetching room compositions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
