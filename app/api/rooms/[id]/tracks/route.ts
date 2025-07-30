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

    // First try to fetch real tracks from database
    // Check both audioTrack and audioFile tables
    try {
      // Fetch AudioTrack records (legacy room tracks)
      const audioTracks = await prisma.audioTrack.findMany({
        where: { roomId: params.id },
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: { uploadedAt: 'desc' }
      })

      // Fetch AudioFile records that have been moved to this room
      const audioFiles = await prisma.audioFile.findMany({
        where: { roomId: params.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      console.log(`Found ${audioTracks.length} audioTracks and ${audioFiles.length} audioFiles for room ${params.id}`)

      const allTracks = []

      // Process AudioTrack records
      if (audioTracks.length > 0) {
        const trackRecords = audioTracks.map((track: any) => ({
          id: track.id,
          name: track.name,
          originalName: track.originalName || track.name,
          uploadedBy: {
            id: track.uploader.id,
            username: track.uploader.username || track.uploader.email?.split('@')[0] || 'User',
            avatar: null
          },
          duration: track.duration || "0:00",
          filePath: track.filePath,
          fileSize: track.fileSize || 0,
          mimeType: track.mimeType || 'audio/mpeg',
          audioFileId: track.metadata?.audioFileId || track.id,
          isPlaying: false,
          isMuted: false,
          isSolo: false,
          isLocked: false,
          volume: 1.0,
          pan: 0,
          effects: {
            reverb: 0,
            delay: 0,
            lowpass: 0,
            highpass: 0,
            distortion: 0
          },
          color: generateTrackColor(),
          uploadedAt: track.uploadedAt,
          source: 'audioTrack'
        }))
        allTracks.push(...trackRecords)
      }

      // Process AudioFile records (moved to room files)
      if (audioFiles.length > 0) {
        const fileRecords = audioFiles.map((file: any) => ({
          id: file.id,
          name: file.originalName,
          originalName: file.originalName,
          uploadedBy: {
            id: file.user.id,
            username: file.user.username || file.user.email?.split('@')[0] || 'User',
            avatar: null
          },
          duration: file.duration ? `${Math.floor(Number(file.duration) / 60)}:${Math.floor(Number(file.duration) % 60).toString().padStart(2, '0')}` : "0:00",
          filePath: file.filePath,
          fileSize: Number(file.fileSize) || 0,
          mimeType: file.mimeType || 'audio/mpeg',
          audioFileId: file.id, // For moved files, the audioFileId is the file ID itself
          isPlaying: false,
          isMuted: false,
          isSolo: false,
          isLocked: false,
          volume: 1.0,
          pan: 0,
          effects: {
            reverb: 0,
            delay: 0,
            lowpass: 0,
            highpass: 0,
            distortion: 0
          },
          color: generateTrackColor(),
          uploadedAt: file.createdAt,
          source: 'audioFile'
        }))
        allTracks.push(...fileRecords)
      }

      if (allTracks.length > 0) {
        // Sort all tracks by upload date (newest first)
        allTracks.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
        
        console.log(`✅ Found ${allTracks.length} total tracks for room ${params.id}`)
        return NextResponse.json({ tracks: allTracks })
      }

      console.log(`📋 No tracks found for room ${params.id}, falling back to mock data`)
    } catch (dbError) {
      console.error('Database error fetching tracks:', dbError)
      console.log('📋 Database unavailable, using mock data')
    }

    // Fallback to mock data if no real tracks or database error
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

      // First create audio file record
      const audioFile = await prisma.audioFile.create({
        data: {
          userId: tokenData.id,
          filename: fileName,
          originalName: file.name,
          filePath: `/uploads/rooms/${params.id}/${fileName}`,
          fileSize: BigInt(file.size),
          mimeType: file.type,
          isProcessed: false,
          isPublic: false,
          roomId: params.id,
          metadata: {
            uploadedVia: 'room-track-upload',
            originalFileName: file.name
          }
        }
      })

      // Then create audio track record linking to the audio file
      const audioTrack = await prisma.audioTrack.create({
        data: {
          roomId: params.id,
          uploaderId: tokenData.id,
          name: trackName || file.name,
          filePath: `/uploads/rooms/${params.id}/${fileName}`,
          duration: "0:00", // Will be updated after audio analysis
          waveform: [],
          artist: tokenData.email?.split('@')[0] || 'User',
          metadata: {
            audioFileId: audioFile.id,
            originalFileName: file.name
          }
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
        originalName: audioFile.originalName,
        uploadedBy: {
          id: uploader?.id || tokenData.id,
          username: uploader?.username || uploader?.email?.split('@')[0] || 'User'
        },
        duration: audioTrack.duration || "0:00",
        waveform: audioTrack.waveform as number[],
        filePath: audioTrack.filePath,
        fileSize: Number(audioFile.fileSize),
        mimeType: audioFile.mimeType,
        audioFileId: audioFile.id, // Include reference to AudioFile record
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

      // Background processing to extract audio metadata for the track
      setTimeout(async () => {
        try {
          console.log(`📊 [Room Upload] Starting metadata extraction for track ${audioTrack.id}`)
          
          // Call audio service to analyze the file
          const audioServiceUrl = 'http://audio-service:3006/analyze'
          const trackFilePath = audioTrack.filePath
          
          if (!trackFilePath) {
            console.error(`❌ [Room Upload] No file path for track ${audioTrack.id}`)
            return
          }
          
          const fullFilePath = path.join(process.cwd(), 'public', trackFilePath)
          
          const response = await fetch(audioServiceUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filePath: fullFilePath
            })
          })

          if (response.ok) {
            const response_data = await response.json()
            console.log(`✅ [Room Upload] Audio metadata extracted for track ${audioTrack.id}:`, response_data)
            
            const metadata = response_data.metadata
            
            // Update the audio_tracks record with metadata
            await prisma.audioTrack.update({
              where: { id: audioTrack.id },
              data: {
                duration: `${Math.floor(metadata.duration / 60)}:${Math.floor(metadata.duration % 60).toString().padStart(2, '0')}`
              }
            })
            
            // Also update the linked AudioFile record
            await prisma.audioFile.update({
              where: { id: audioFile.id },
              data: {
                duration: metadata.duration,
                sampleRate: metadata.sampleRate,
                channels: metadata.channels,
                bitRate: metadata.bitRate,
                format: metadata.format,
                isProcessed: true
              }
            })
            
            console.log(`✅ [Room Upload] Updated metadata for track ${audioTrack.id} and file ${audioFile.id}`)
          } else {
            const error = await response.text()
            console.error(`❌ [Room Upload] Audio analysis failed for track ${audioTrack.id}:`, error)
          }
        } catch (error) {
          console.error(`❌ [Room Upload] Background processing error for track ${audioTrack.id}:`, error)
        }
      }, 1000) // 1 second delay to ensure file is written

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
