import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
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

    // Create sample rooms if none exist
    const roomsCount = await prisma.room.count()

    if (roomsCount === 0) {
      // Create some sample rooms
      const sampleRooms = [
        {
          name: 'Chill Vibes Collaboration',
          description: 'Relaxing music collaboration space',
          genre: 'Electronic',
          creatorId: tokenData.id
        },
        {
          name: 'Jazz Fusion Jam',
          description: 'Experimental jazz collaboration',
          genre: 'Jazz',
          creatorId: tokenData.id
        },
        {
          name: 'Rock Collaboration Studio',
          description: 'High energy rock music creation',
          genre: 'Rock',
          creatorId: tokenData.id
        }
      ]

      const createdRooms = []
      for (const room of sampleRooms) {
        const newRoom = await prisma.room.create({
          data: {
            name: room.name,
            description: room.description,
            genre: room.genre,
            creatorId: room.creatorId,
            isLive: true,
            settings: { maxParticipants: 8, isPublic: true }
          },
          select: {
            id: true,
            name: true
          }
        })

        createdRooms.push(newRoom)

        // Add creator as participant
        await prisma.roomParticipant.create({
          data: {
            roomId: newRoom.id,
            userId: tokenData.id,
            role: 'creator',
            isOnline: true
          }
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Sample rooms created successfully',
        rooms: createdRooms
      })
    } else {
      return NextResponse.json({
        success: true,
        message: `Database already has ${roomsCount} rooms`,
        rooms_count: roomsCount
      })
    }

  } catch (error: any) {
    console.error('Sample data creation error:', error)
    return NextResponse.json({
      error: 'Failed to create sample data',
      message: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
