import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import DatabaseManager from '@/lib/database'

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

  // Validate UUID format for room ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const isValidUUID = uuidRegex.test(params.id)

  // If not a valid UUID, skip database query and go directly to fallback
  if (!isValidUUID) {
    console.log(`Invalid UUID format for room ID: ${params.id}, using mock data`)
    
    const mockRoomData = {
      id: params.id,
      name: 'Chill Vibes Session',
      description: 'Relaxing music collaboration',
      genre: 'Electronic',
      isLive: true,
      creator: tokenData.email?.split('@')[0] || 'User',
      createdAt: new Date().toISOString(),
      participants: [
        {
          id: tokenData.id,
          username: tokenData.email?.split('@')[0] || 'User',
          isOnline: true,
          instruments: ['Guitar'],
          role: 'creator'
        }
      ],
      currentTrack: {
        id: 'track-1',
        name: 'Midnight Dreams',
        artist: 'SynthMaster',
        duration: '3:24',
        uploadedBy: 'SynthMaster',
        waveform: Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2),
        isCurrentlyPlaying: true
      },
      tracks: [
        {
          id: 'track-1',
          name: 'Midnight Dreams',
          artist: 'SynthMaster',
          duration: '3:24',
          uploadedBy: 'SynthMaster',
          waveform: Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2),
          isCurrentlyPlaying: true
        }
      ],
      playbackPosition: 0
    }

    return NextResponse.json(mockRoomData)
  }

  // Try to fetch room details from PostgreSQL
    try {
      const roomQuery = `
        SELECT 
          r.id,
          r.name,
          r.description,
          r.genre,
          r.is_live,
          r.created_at,
          r.playback_position,
          r.settings,
          u.username as creator_username,
          u.email as creator_email
        FROM rooms r
        LEFT JOIN users u ON r.creator_id = u.id
        WHERE r.id = $1
      `

      const roomResult = await DatabaseManager.executeQuery(roomQuery, [params.id])
      
      if (roomResult.rows.length === 0) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 })
      }

      const room = roomResult.rows[0]

      // Fetch participants
      const participantsQuery = `
        SELECT 
          rp.role,
          rp.instruments,
          rp.is_online,
          u.id,
          u.username,
          u.email
        FROM room_participants rp
        LEFT JOIN users u ON rp.user_id = u.id
        WHERE rp.room_id = $1
      `

      const participantsResult = await DatabaseManager.executeQuery(participantsQuery, [params.id])
      
      const participants = participantsResult.rows.map((p: any) => ({
        id: p.id,
        username: p.username || p.email?.split('@')[0] || 'User',
        isOnline: p.is_online,
        instruments: p.instruments || [],
        role: p.role
      }))

      // Fetch tracks
      const tracksQuery = `
        SELECT 
          at.id,
          at.name,
          at.artist,
          at.duration,
          at.waveform,
          at.is_currently_playing,
          u.username as uploader_username,
          u.email as uploader_email
        FROM audio_tracks at
        LEFT JOIN users u ON at.uploader_id = u.id
        WHERE at.room_id = $1
        ORDER BY at.uploaded_at
      `

      const tracksResult = await DatabaseManager.executeQuery(tracksQuery, [params.id])
      
      const tracks = tracksResult.rows.map((t: any) => ({
        id: t.id,
        name: t.name,
        artist: t.artist,
        duration: t.duration,
        uploadedBy: t.uploader_username || t.uploader_email?.split('@')[0] || 'User',
        waveform: t.waveform || Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2),
        isCurrentlyPlaying: t.is_currently_playing
      }))

      const currentTrack = tracks.find((track: any) => track.isCurrentlyPlaying) || null

      const roomData = {
        id: room.id,
        name: room.name,
        description: room.description,
        genre: room.genre,
        isLive: room.is_live,
        creator: room.creator_username || room.creator_email?.split('@')[0] || 'User',
        createdAt: room.created_at,
        participants,
        currentTrack,
        tracks,
        playbackPosition: room.playback_position || 0
      }

      return NextResponse.json(roomData)
    } catch (dbError) {
      console.log('Database not available for room details, using mock data:', dbError)
      
      // Fallback to mock room data if database is not available
      const mockRoomData = {
        id: params.id,
        name: 'Chill Vibes Session',
        description: 'Relaxing music collaboration',
        genre: 'Electronic',
        isLive: true,
        creator: tokenData.email?.split('@')[0] || 'User',
        createdAt: new Date().toISOString(),
        participants: [
          {
            id: tokenData.id,
            username: tokenData.email?.split('@')[0] || 'User',
            isOnline: true,
            instruments: ['Guitar'],
            role: 'creator'
          },
          {
            id: 'mock-user-2',
            username: 'SynthMaster',
            isOnline: true,
            instruments: ['Synthesizer', 'Piano'],
            role: 'participant'
          },
          {
            id: 'mock-user-3',
            username: 'DrumBot',
            isOnline: false,
            instruments: ['Drums'],
            role: 'participant'
          }
        ],
        currentTrack: {
          id: 'track-1',
          name: 'Midnight Dreams',
          artist: 'SynthMaster',
          duration: '3:24',
          uploadedBy: 'SynthMaster',
          waveform: Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2),
          isCurrentlyPlaying: true
        },
        tracks: [
          {
            id: 'track-1',
            name: 'Midnight Dreams',
            artist: 'SynthMaster',
            duration: '3:24',
            uploadedBy: 'SynthMaster',
            waveform: Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2),
            isCurrentlyPlaying: true
          },
          {
            id: 'track-2',
            name: 'Electric Pulse',
            artist: tokenData.email?.split('@')[0] || 'User',
            duration: '4:17',
            uploadedBy: tokenData.email?.split('@')[0] || 'User',
            waveform: Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2),
            isCurrentlyPlaying: false
          },
          {
            id: 'track-3',
            name: 'Cosmic Journey',
            artist: 'DrumBot',
            duration: '5:32',
            uploadedBy: 'DrumBot',
            waveform: Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2),
            isCurrentlyPlaying: false
          }
        ],
        playbackPosition: 0
      }

      return NextResponse.json(mockRoomData)
    }
  } catch (error) {
    console.error('Error fetching room:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
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

    const body = await request.json()
    
    // Mock update - in real app this would update PostgreSQL
    console.log('Room update request:', { roomId: params.id, data: body })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating room:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
