import { NextRequest, NextResponse } from 'next/server'
import DatabaseManager from '@/lib/database'
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
    const roomsCount = await DatabaseManager.executeQuery('SELECT COUNT(*) as count FROM rooms')
    const currentRoomsCount = parseInt(roomsCount.rows[0]?.count || '0')

    if (currentRoomsCount === 0) {
      // Create some sample rooms
      const sampleRooms = [
        {
          name: 'Chill Vibes Collaboration',
          description: 'Relaxing music collaboration space',
          genre: 'Electronic',
          creator_id: tokenData.id
        },
        {
          name: 'Jazz Fusion Jam',
          description: 'Experimental jazz collaboration',
          genre: 'Jazz',
          creator_id: tokenData.id
        },
        {
          name: 'Rock Collaboration Studio',
          description: 'High energy rock music creation',
          genre: 'Rock',
          creator_id: tokenData.id
        }
      ]

      const createdRooms = []
      for (const room of sampleRooms) {
        const result = await DatabaseManager.executeQuery(
          `INSERT INTO rooms (id, name, description, genre, creator_id, is_live, settings, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, true, $5, NOW())
           RETURNING id, name`,
          [
            room.name,
            room.description,
            room.genre,
            room.creator_id,
            JSON.stringify({ maxParticipants: 8, isPublic: true })
          ]
        )

        const newRoom = result.rows[0]
        createdRooms.push(newRoom)

        // Add creator as participant
        await DatabaseManager.executeQuery(
          `INSERT INTO room_participants (room_id, user_id, role, is_online)
           VALUES ($1, $2, 'creator', true)`,
          [newRoom.id, room.creator_id]
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Sample rooms created successfully',
        rooms: createdRooms
      })
    } else {
      return NextResponse.json({
        success: true,
        message: `Database already has ${currentRoomsCount} rooms`,
        rooms_count: currentRoomsCount
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
