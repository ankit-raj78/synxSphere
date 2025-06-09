import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import DatabaseManager from '@/lib/database'

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

    try {
      // Try to fetch rooms from PostgreSQL
      const query = `
        SELECT 
          r.id,
          r.name,
          r.description,
          r.genre,
          r.is_live,
          r.created_at,
          u.username as creator_username,
          u.email as creator_email,
          COUNT(rp.user_id) as participant_count
        FROM rooms r
        LEFT JOIN users u ON r.creator_id = u.id
        LEFT JOIN room_participants rp ON r.id = rp.room_id
        GROUP BY r.id, u.username, u.email
        ORDER BY r.created_at DESC
      `

      const result = await DatabaseManager.executeQuery(query)
      
      const rooms = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        genre: row.genre,
        participantCount: parseInt(row.participant_count) || 0,
        maxParticipants: 10,
        isLive: row.is_live,
        creator: row.creator_username || row.creator_email?.split('@')[0] || 'Unknown',
        createdAt: row.created_at
      }))

      return NextResponse.json(rooms)
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
    }

    // Create room in PostgreSQL
    const roomQuery = `
      INSERT INTO rooms (name, description, genre, creator_id, is_live, settings)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, description, genre, is_live, created_at
    `
      const settings = {
      isPublic,
      maxParticipants
    }

    const roomResult = await DatabaseManager.executeQuery(roomQuery, [
      name,
      description,
      genre,
      tokenData.id,
      true, // is_live
      JSON.stringify(settings)
    ])

    const newRoom = roomResult.rows[0]

    // Add creator as first participant
    const participantQuery = `
      INSERT INTO room_participants (room_id, user_id, role, is_online)
      VALUES ($1, $2, $3, $4)
    `

    await DatabaseManager.executeQuery(participantQuery, [
      newRoom.id,
      tokenData.id,
      'creator',
      true
    ])

    // Return the created room with participant count
    const responseRoom = {
      id: newRoom.id,
      name: newRoom.name,
      description: newRoom.description,
      genre: newRoom.genre,
      participantCount: 1,
      maxParticipants,
      isLive: newRoom.is_live,
      creator: tokenData.email?.split('@')[0] || 'User',
      createdAt: newRoom.created_at
    }

    return NextResponse.json(responseRoom, { status: 201 })
  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
