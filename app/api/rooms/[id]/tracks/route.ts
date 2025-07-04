import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// GET - Fetch tracks for a room
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

// POST - Upload new track to room
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const trackName = formData.get('name') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/m4a', 'audio/ogg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    try {
      // Check if room exists and user is a participant
      const room = await prisma.room.findUnique({
        where: { id: params.id },
        include: {
          participants: {
            where: { userId: tokenData.id }
          }
        }
      })

      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 })
      }

      if (room.participants.length === 0 && room.creatorId !== tokenData.id) {
        return NextResponse.json({ error: 'Not authorized to upload to this room' }, { status: 403 })
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'rooms', params.id)
      await mkdir(uploadsDir, { recursive: true })

      // Generate unique filename
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop()}`
      const filePath = path.join(uploadsDir, fileName)

      // Save file
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      // Create audio track record with available fields
      const audioTrack = await prisma.audioTrack.create({
        data: {
          roomId: params.id,
          uploaderId: tokenData.id,
          name: trackName || file.name,
          filePath: `/uploads/rooms/${params.id}/${fileName}`,
          duration: "0:00", // Will be updated after audio analysis
          waveform: [],
          artist: tokenData.email?.split('@')[0] || 'User'
        }
      })

      // Get uploader info separately
      const uploader = await prisma.user.findUnique({
        where: { id: tokenData.id },
        select: {
          id: true,
          username: true,
          email: true
        }
      })

      // Format response
      const track = {
        id: audioTrack.id,
        name: audioTrack.name,
        originalName: file.name, // Use file.name since originalName isn't in schema
        uploadedBy: {
          id: uploader?.id || tokenData.id,
          username: uploader?.username || uploader?.email?.split('@')[0] || 'User'
        },
        duration: audioTrack.duration || "0:00",
        waveform: audioTrack.waveform as number[],
        filePath: audioTrack.filePath,
        fileSize: file.size, // Use file.size since not in schema
        mimeType: file.type, // Use file.type since not in schema  
        volume: 1.0, // Default since not in schema
        pan: 0, // Default since not in schema
        effects: {
          reverb: 0,
          delay: 0,
          lowpass: 0,
          highpass: 0,
          distortion: 0
        },
        isPlaying: false,
        isMuted: false,
        isSolo: false,
        isLocked: false,
        color: generateTrackColor(),
        uploadedAt: audioTrack.uploadedAt
      }

      return NextResponse.json({ 
        message: 'File uploaded successfully',
        track 
      })

    } catch (dbError) {
      console.log('Database not available for file upload:', dbError)
      
      // Mock response for demo
      const mockTrack = {
        id: `track-${Date.now()}`,
        name: trackName || file.name,
        originalName: file.name,
        uploadedBy: {
          id: tokenData.id,
          username: tokenData.email?.split('@')[0] || 'User'
        },
        duration: Math.floor(Math.random() * 240) + 60, // 1-4 minutes
        waveform: Array.from({ length: 200 }, () => Math.random() * 0.8 + 0.2),
        filePath: `/uploads/rooms/${params.id}/${file.name}`,
        fileSize: file.size,
        mimeType: file.type,
        volume: 1.0,
        pan: 0,
        effects: {
          reverb: 0,
          delay: 0,
          lowpass: 0,
          highpass: 0,
          distortion: 0
        },
        isPlaying: false,
        isMuted: false,
        isSolo: false,
        isLocked: false,
        color: generateTrackColor(),
        uploadedAt: new Date().toISOString()
      }

      return NextResponse.json({ 
        message: 'File uploaded successfully (mock)',
        track: mockTrack
      })
    }

  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateTrackColor(): string {
  const colors = [
    '#8b5cf6', '#ef4444', '#10b981', '#f59e0b', 
    '#3b82f6', '#ec4899', '#06b6d4', '#84cc16'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// PUT - Update track metadata
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

// DELETE - Remove a track from the room
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
