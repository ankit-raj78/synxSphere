import { NextRequest, NextResponse } from 'next/server'

// This route requires authentication and should not be statically generated
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'

import { verifyToken } from '@/lib/auth'


export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const tokenData =  verifyToken(token)
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check database connectivity and data
    const diagnostics: any = {
      database: 'connected',
      timestamp: new Date().toISOString(),
      user: tokenData
    }

    try {
      // Count rooms using Prisma
      const roomsCount = await prisma.room.count()
      diagnostics.rooms_count = roomsCount

      // Count users using Prisma
      const usersCount = await prisma.user.count()
      diagnostics.users_count = usersCount

      // Count participants using Prisma
      const participantsCount = await prisma.roomParticipant.count()
      diagnostics.participants_count = participantsCount

      // Sample rooms using Prisma
      const sampleRooms = await prisma.room.findMany({
        select: {
          id: true,
          name: true,
          creatorId: true,
          createdAt: true
        },
        take: 5
      })
      diagnostics.sample_rooms = sampleRooms

      // Sample users using Prisma
      const sampleUsers = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true
        },
        take: 5
      })
      diagnostics.sample_users = sampleUsers

    } catch (dbError: any) {
      diagnostics.database = 'error'
      diagnostics.error = dbError?.message || 'Unknown database error'
    }

    return NextResponse.json(diagnostics)

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Diagnostic failed',
      message: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
