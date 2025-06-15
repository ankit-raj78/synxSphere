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

    // Mock data for now - in production this would fetch from database
    const mockTracks = [
      {
        id: 'track-1',
        name: 'Arctic Monkeys - Do I Wanna Know - Bass',
        originalName: 'Arctic Monkeys - Do I Wanna Know？ (Official Video)_bass.wav',
        uploadedBy: {
          id: 'user-1',
          username: 'musicfan',
          avatar: null
        },
        duration: 212.5,
        waveform: Array.from({ length: 200 }, (_, i) => Math.sin(i * 0.1) * 0.5 + 0.5),
        isPlaying: false,
        isMuted: false,
        isSolo: false,
        isLocked: false,
        volume: 75,
        pan: 0,
        effects: {
          reverb: 0,
          delay: 0,
          lowpass: 0,
          highpass: 0,
          distortion: 0
        },
        color: '#8B5CF6',
        uploadedAt: new Date().toISOString()
      },
      {
        id: 'track-2',
        name: 'Arctic Monkeys - Do I Wanna Know - Drums',
        originalName: 'Arctic Monkeys - Do I Wanna Know？ (Official Video)_drums.wav',
        uploadedBy: {
          id: 'user-2',
          username: 'drummer_pro',
          avatar: null
        },
        duration: 212.5,
        waveform: Array.from({ length: 200 }, (_, i) => Math.random() * 0.8 + 0.2),
        isPlaying: false,
        isMuted: false,
        isSolo: false,
        isLocked: false,
        volume: 80,
        pan: 0,
        effects: {
          reverb: 10,
          delay: 5,
          lowpass: 0,
          highpass: 0,
          distortion: 0
        },
        color: '#EF4444',
        uploadedAt: new Date().toISOString()
      },
      {
        id: 'track-3',
        name: 'Arctic Monkeys - Do I Wanna Know - Vocals',
        originalName: 'Arctic Monkeys - Do I Wanna Know？ (Official Video)_vocals.wav',
        uploadedBy: {
          id: 'user-3',
          username: 'vocalist',
          avatar: null
        },
        duration: 212.5,
        waveform: Array.from({ length: 200 }, (_, i) => Math.sin(i * 0.05) * 0.7 + 0.3),
        isPlaying: false,
        isMuted: false,
        isSolo: false,
        isLocked: false,
        volume: 85,
        pan: 0,
        effects: {
          reverb: 25,
          delay: 15,
          lowpass: 0,
          highpass: 10,
          distortion: 0
        },
        color: '#10B981',
        uploadedAt: new Date().toISOString()
      },
      {
        id: 'track-4',
        name: 'Arctic Monkeys - Do I Wanna Know - Other',
        originalName: 'Arctic Monkeys - Do I Wanna Know？ (Official Video)_other.wav',
        uploadedBy: {
          id: 'user-4',
          username: 'guitarist',
          avatar: null
        },
        duration: 212.5,
        waveform: Array.from({ length: 200 }, (_, i) => Math.cos(i * 0.08) * 0.6 + 0.4),
        isPlaying: false,
        isMuted: false,
        isSolo: false,
        isLocked: false,
        volume: 70,
        pan: 0,
        effects: {
          reverb: 15,
          delay: 8,
          lowpass: 0,
          highpass: 0,
          distortion: 5
        },
        color: '#F59E0B',
        uploadedAt: new Date().toISOString()
      }
    ]

    return NextResponse.json({ tracks: mockTracks })
  } catch (error) {
    console.error('Error fetching room tracks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
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

    const body = await request.json()
    const { trackData } = body

    // In production, this would save to database
    const newTrack = {
      id: `track-${Date.now()}`,
      ...trackData,
      uploadedBy: {
        id: tokenData.id,
        username: tokenData.email?.split('@')[0] || 'User',
        avatar: null
      },
      uploadedAt: new Date().toISOString()
    }

    return NextResponse.json({ track: newTrack }, { status: 201 })
  } catch (error) {
    console.error('Error adding track:', error)
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

    const tokenData = await verifyToken(token)
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { trackId, updates } = body

    // In production, this would update the database
    return NextResponse.json({ 
      success: true, 
      trackId, 
      updates,
      message: 'Track updated successfully' 
    })
  } catch (error) {
    console.error('Error updating track:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get('trackId')

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID required' }, { status: 400 })
    }

    // In production, this would delete from database
    return NextResponse.json({ 
      success: true, 
      trackId,
      message: 'Track deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting track:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
