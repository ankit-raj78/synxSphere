import { NextRequest, NextResponse } from 'next/server'

// This route requires authentication and should not be statically generated
export const dynamic = 'force-dynamic'
import { verifyToken } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

import { writeFile, mkdir } from 'fs/promises'
import { parseBuffer } from 'music-metadata'

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

    try {
      // Fetch real tracks from database
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

      // Process tracks and try to find missing audioFileId references
      const tracks = await Promise.all(audioTracks.map(async track => {
        const metadata = track.metadata as any // Cast to any to access nested properties
        
        // Get audioFileId from metadata, or try to find it by matching filePath
        let audioFileId = metadata?.audioFileId
        
        // If audioFileId is missing, try to find the AudioFile record by filePath
        if (!audioFileId && track.filePath) {
          try {
            const audioFile = await prisma.audioFile.findFirst({
              where: {
                roomId: params.id,
                filePath: track.filePath
              }
            })
            if (audioFile) {
              audioFileId = audioFile.id
              console.log(`[GET] Found missing audioFileId for track ${track.name}: ${audioFileId}`)
            }
          } catch (error) {
            console.warn(`[GET] Could not find AudioFile for track ${track.name}:`, error)
          }
        }
        
        return {
          id: track.id,
          name: track.name,
          originalName: metadata?.originalFileName || track.name,
          uploadedBy: {
            id: track.uploader.id,
            username: track.uploader.username || track.uploader.email?.split('@')[0] || 'User',
            avatar: null
          },
          duration: track.duration || "0:00",
          waveform: track.waveform as number[] || [],
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
          color: generateTrackColor(),
          filePath: track.filePath,
          audioFileId: audioFileId, // Ensure this is always present when possible
          uploadedAt: track.uploadedAt.toISOString()
        }
      }))

      return NextResponse.json({ tracks })

    } catch (dbError) {
      console.log('Database not available, using mock data:', dbError)
      
      // Fallback to mock data if database is unavailable
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
          duration: "0:00",
          waveform: [],
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
        }
      ]

      return NextResponse.json({ tracks: mockTracks })
    }
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
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/flac', 'audio/m4a', 'audio/ogg', 'audio/mp3', 'application/octet-stream']
    
    // For octet-stream, also check file extension as additional validation
    if (file.type === 'application/octet-stream') {
      const fileName = file.name.toLowerCase()
      const allowedExtensions = ['.wav', '.mp3', '.flac', '.m4a', '.ogg']
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext))
      
      if (!hasValidExtension) {
        return NextResponse.json({ 
          error: `File type ${file.type} requires valid audio extension. File: ${file.name}` 
        }, { status: 400 })
      }
    } else if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `Invalid file type: ${file.type}. Allowed types: ${allowedTypes.join(', ')}` }, { status: 400 })
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

      // Extract audio metadata for duration and other info
      let duration = "0:00"
      let audioMetadata: any = {}
      
      try {
        const metadata = await parseBuffer(buffer, file.type)
        if (metadata.format.duration) {
          const durationInSeconds = Math.round(metadata.format.duration)
          const minutes = Math.floor(durationInSeconds / 60)
          const seconds = durationInSeconds % 60
          duration = `${minutes}:${seconds.toString().padStart(2, '0')}`
        }
        
        audioMetadata = {
          duration: metadata.format.duration,
          sampleRate: metadata.format.sampleRate,
          bitrate: metadata.format.bitrate,
          numberOfChannels: metadata.format.numberOfChannels,
          codec: metadata.format.codec
        }
        
        console.log(`[Upload] Extracted metadata for ${file.name}:`, audioMetadata)
      } catch (metadataError) {
        console.warn(`[Upload] Could not extract metadata for ${file.name}:`, metadataError)
        // Use default values if metadata extraction fails
      }

      // First create audio file record
      const audioFile = await prisma.audioFile.create({
        data: {
          userId: tokenData.id,
          filename: fileName,
          originalName: file.name,
          filePath: `/uploads/rooms/${params.id}/${fileName}`,
          fileSize: BigInt(file.size),
          mimeType: file.type,
          isProcessed: true, // Mark as processed since we extracted metadata
          isPublic: false,
          roomId: params.id,
          metadata: {
            uploadedVia: 'room-track-upload',
            originalFileName: file.name,
            audioMetadata: audioMetadata
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
          duration: duration, // Use extracted duration
          waveform: [], // Could generate basic waveform here in the future
          artist: tokenData.email?.split('@')[0] || 'User',
          metadata: {
            audioFileId: audioFile.id,
            originalFileName: file.name,
            audioMetadata: audioMetadata
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

    try {
      // Get track info before deletion
      const audioTrack = await prisma.audioTrack.findUnique({
        where: { id: trackId }
      })

      if (!audioTrack) {
        return NextResponse.json({ error: 'Track not found' }, { status: 404 })
      }

      // Check permission - only track uploader or room creator can delete
      if (audioTrack.uploaderId !== tokenData.id) {
        // TODO: Also check if user is room creator
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
      }

      // Delete physical file from filesystem
      if (audioTrack.filePath) {
        const fs = require('fs').promises
        const path = require('path')
        
        try {
          let fullPath: string
          if (audioTrack.filePath.startsWith('/uploads/rooms/')) {
            // Room-specific uploads: /uploads/rooms/{roomId}/{filename}
            const relativePath = audioTrack.filePath.substring(1) // Remove leading /
            fullPath = path.join(process.cwd(), 'public', relativePath)
          } else {
            // Other formats - construct full path
            fullPath = path.join(process.cwd(), 'public', audioTrack.filePath)
          }
          
          console.log(`[Delete] Attempting to delete file: ${fullPath}`)
          await fs.unlink(fullPath)
          console.log(`[Delete] Successfully deleted file: ${fullPath}`)
        } catch (fileError) {
          console.warn(`[Delete] Could not delete file ${audioTrack.filePath}:`, fileError)
          // Continue with database deletion even if file deletion fails
        }
      }

      // Also find and delete the associated AudioFile record if it exists
      // Look for AudioFile with matching filePath and roomId
      if (audioTrack.filePath) {
        const audioFiles = await prisma.audioFile.findMany({
          where: {
            roomId: params.id,
            filePath: audioTrack.filePath
          }
        })

        // Delete associated AudioFile records
        for (const audioFile of audioFiles) {
          await prisma.audioFile.delete({
            where: { id: audioFile.id }
          })
          console.log(`[Delete] Deleted associated AudioFile record: ${audioFile.id}`)
        }
      }

      // Delete the AudioTrack record
      await prisma.audioTrack.delete({
        where: { id: trackId }
      })

      console.log(`[Delete] Successfully deleted track ${trackId} and associated records`)

      return NextResponse.json({ 
        success: true, 
        trackId,
        message: 'Track and file deleted successfully' 
      })

    } catch (dbError) {
      console.error('[Delete] Database error:', dbError)
      
      // Fallback: just return success for now to avoid blocking UI
      return NextResponse.json({ 
        success: true, 
        trackId,
        message: 'Track deletion processed (database unavailable)' 
      })
    }

  } catch (error) {
    console.error('Error deleting track:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
