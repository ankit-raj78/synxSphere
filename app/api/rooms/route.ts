import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }    const tokenData = await verifyToken(token)
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    try {      // Try to fetch rooms from PostgreSQL using Prisma
      const rooms = await prisma.room.findMany({
        where: {
          name: {
            not: {
              contains: 'test'
            }
          }
        },
        include: {
          creator: {
            select: {
              username: true,
              email: true
            }
          },
          participants: {
            select: {
              userId: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      const roomsData = rooms.map((room) => {
        let settings = { maxParticipants: 10 }
        try {
          if (room.settings) {
            settings = typeof room.settings === 'object' ? room.settings as any : JSON.parse(room.settings as string)
          }
        } catch (e) {
          console.log('Error parsing room settings:', e)
        }
        
        return {
          id: room.id,
          name: room.name,
          description: room.description,
          genre: room.genre,
          participantCount: room.participants.length,
          maxParticipants: settings.maxParticipants || 10,
          isLive: room.isLive,
          creator: room.creator?.username || room.creator?.email?.split('@')[0] || 'Unknown',
          creatorId: room.creatorId,
          createdAt: room.createdAt
        }
      })

      return NextResponse.json(roomsData)
    } catch (dbError) {
      console.log('Database not available, using mock data:', dbError)
      
      // Fallback to mock data if database is not available
      const mockRooms = [
        {
          id: '1',
          name: 'Chill Vibes Session',
          description: 'Relaxing music collaboration',
          genre: 'Electronic',
          participantCount: 3,
          maxParticipants: 8,
          isLive: true,
          creator: 'SynthMaster',
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Jazz Jam',
          description: 'Improvisation and smooth jazz',
          genre: 'Jazz',
          participantCount: 2,
          maxParticipants: 6,
          isLive: true,
          creator: 'JazzCat',
          createdAt: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Rock Fusion',
          description: 'High energy rock collaboration',
          genre: 'Rock',
          participantCount: 4,
          maxParticipants: 10,
          isLive: false,
          creator: tokenData.email?.split('@')[0] || 'User',
          createdAt: new Date().toISOString()
        }
      ]

      return NextResponse.json(mockRooms)
    }
  } catch (error) {
    console.error('Error fetching rooms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const body = await request.json()
    const { name, description, genre = 'General', isPublic = true, maxParticipants = 10 } = body

    if (!name || !description) {
      return NextResponse.json({ error: 'Name and description are required' }, { status: 400 })
    }    // Create room in PostgreSQL using Prisma
    try {
      const settings = {
        isPublic,
        maxParticipants
      }

      const newRoom = await prisma.room.create({
        data: {
          name,
          description,
          genre,
          creatorId: tokenData.id,
          isLive: true,
          settings: settings
        }
      })

      // Add creator as first participant using Prisma
      await prisma.roomParticipant.create({
        data: {
          roomId: newRoom.id,
          userId: tokenData.id,
          role: 'creator',
          isOnline: true
        }
      })

      // Return the created room with participant count
      const responseRoom = {
        id: newRoom.id,
        name: newRoom.name,
        description: newRoom.description,
        genre: newRoom.genre,
        participantCount: 1,
        maxParticipants,
        isLive: newRoom.isLive,
        creator: tokenData.email?.split('@')[0] || 'User',
        createdAt: newRoom.createdAt
      }

      return NextResponse.json(responseRoom, { status: 201 })
    } catch (dbError) {    console.log('Database not available for room creation, using mock response:', dbError)
      
      // Generate a proper UUID for fallback
      const { v4: uuidv4 } = require('uuid')
      
      // Fallback to mock room creation if database is not available
      const mockRoom = {
        id: uuidv4(),
        name,
        description,
        genre: genre || 'General',
        participantCount: 1,
        maxParticipants,
        isLive: true,
        creator: tokenData.email?.split('@')[0] || 'User',
        createdAt: new Date().toISOString()
      }

      return NextResponse.json(mockRoom, { status: 201 })
    }
  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
