import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { ObjectId } from 'mongodb'

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

    const { db } = await connectToDatabase()
    
    // Fetch the actual user data
    const user = await db.collection('users').findOne({
      _id: new ObjectId(tokenData.userId)
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Find the room by ID
    const room = await db.collection('rooms').findOne({
      _id: new ObjectId(params.id)
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Check if user is authorized to access this room
    const isParticipant = room.participants.some((p: any) => p._id.toString() === user._id.toString()) || room.creator.toString() === user._id.toString()

    if (!isParticipant) {
      return NextResponse.json({ error: 'Not authorized to access this room' }, { status: 403 })
    }

    // Mock data for demonstration - in a real app, this would come from the database
    const mockRoomData = {
      _id: room._id,
      name: room.name || 'Chill Vibes Session',
      description: room.description || 'Relaxing music collaboration',
      genre: room.genre || 'Electronic',
      isLive: true,
      creator: room.creator,
      createdAt: room.createdAt,
      participants: [
        {
          _id: user._id,
          username: user.username || 'Unknown User',
          isOnline: true,
          instruments: user.profile?.instruments || ['Guitar'],
          role: room.creator.toString() === user._id.toString() ? 'creator' : 'participant'
        },
        {
          _id: new ObjectId().toString(),
          username: 'SynthMaster',
          isOnline: true,
          instruments: ['Synthesizer', 'Piano'],
          role: 'participant'
        },
        {
          _id: new ObjectId().toString(),
          username: 'DrumBot',
          isOnline: false,
          instruments: ['Drums'],
          role: 'participant'
        }
      ],
      currentTrack: {
        _id: new ObjectId().toString(),
        name: 'Midnight Dreams',
        artist: 'SynthMaster',
        duration: '3:24',
        uploadedBy: 'SynthMaster',
        waveform: Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2),
        isCurrentlyPlaying: true
      },
      tracks: [
        {
          _id: new ObjectId().toString(),
          name: 'Midnight Dreams',
          artist: 'SynthMaster',
          duration: '3:24',
          uploadedBy: 'SynthMaster',
          waveform: Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2),
          isCurrentlyPlaying: true
        },
        {
          _id: new ObjectId().toString(),
          name: 'Electric Pulse',
          artist: user.username || 'Unknown User',
          duration: '4:17',
          uploadedBy: user.username || 'Unknown User',
          waveform: Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2),
          isCurrentlyPlaying: false
        },
        {
          _id: new ObjectId().toString(),
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
    const { db } = await connectToDatabase()
    
    // Update room data
    const result = await db.collection('rooms').updateOne(
      { _id: new ObjectId(params.id) },
      { 
        $set: {
          ...body,
          updatedAt: new Date()
        }
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating room:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
