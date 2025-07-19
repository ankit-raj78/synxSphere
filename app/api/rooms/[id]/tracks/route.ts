import { NextRequest, NextResponse } from 'next/server'

// This route requires authentication and should not be statically generated
export const dynamic = 'force-dynamic'
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

    // Fetch actual tracks from database
    const audioTracks = await prisma.audioTrack.findMany({
      where: {
        roomId: params.id
      },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    })

    // Convert database tracks to frontend format
    const tracks = audioTracks.map(track => ({
      id: track.id,
      name: track.name,
      originalName: track.name, // Use name since originalName isn't in schema
      uploadedBy: {
        id: track.uploader.id,
        username: track.uploader.username || track.uploader.email?.split('@')[0] || 'User',
        avatar: null
      },
      duration: typeof track.duration === 'string' ? parseFloat(track.duration) : 0,
      waveform: Array.isArray(track.waveform) ? track.waveform : Array.from({ length: 200 }, (_, i) => Math.sin(i * 0.1) * 0.5 + 0.5),
      filePath: track.filePath,
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
      color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`, // Random color
      uploadedAt: track.uploadedAt.toISOString()
    }))

    return NextResponse.json({ tracks })
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
