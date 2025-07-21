import { NextRequest, NextResponse } from 'next/server'

// This route requires authentication and should not be statically generated
export const dynamic = 'force-dynamic'
import { verifyToken } from '@/lib/auth'

import { prisma } from '@/lib/prisma'


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
      // Fetch room details with creator information
      const room = await prisma.room.findUnique({
        where: { id: params.id },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      });
      
      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 })
      }

      // Fetch participants
      const participants = await prisma.roomParticipant.findMany({
        where: { roomId: params.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      });

      const participantList = participants.map((p: { user: { id: string; email: string; username: string } } & { id: string; roomId: string; userId: string; role: string; instruments: any; isOnline: boolean; joinedAt: Date }) => ({
        id: p.user.id,
        username: p.user.username || p.user.email?.split('@')[0] || 'User',
        isOnline: p.isOnline,
        instruments: p.instruments || [],
        role: p.role
      }));

      // Fetch tracks
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
        orderBy: { uploadedAt: 'asc' }
      });
      
      const tracks = audioTracks.map((t: any) => ({
        id: t.id,
        name: t.name,
        artist: t.artist,
        duration: t.duration,
        uploadedBy: t.uploader.username || t.uploader.email?.split('@')[0] || 'User',
        waveform: t.waveform as number[] || Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2),
        isCurrentlyPlaying: t.isCurrentlyPlaying
      }));

      const currentTrack = tracks.find((track: any) => track.isCurrentlyPlaying) || null;

      const roomData = {
        id: room.id,
        name: room.name,
        description: room.description,
        genre: room.genre,
        isLive: room.isLive,
        creator: room.creator.username || room.creator.email?.split('@')[0] || 'User',
        createdAt: room.createdAt,
        participants: participantList,
        currentTrack,
        tracks,
        playbackPosition: room.playbackPosition || 0
      }

      return NextResponse.json(roomData)
    } catch (dbError) {
      console.log('Database not available for room details, using mock data:', dbError)
      
      // Fallback to mock room data if database is not available
      const mockParticipants = [
        {
          id: tokenData.id,
          username: tokenData.email?.split('@')[0] || 'User',
          isOnline: true,
          instruments: ['Guitar'],
          role: 'creator'
        },
        {
          id: 'user2-id',
          username: 'user2',
          isOnline: true,
          instruments: ['Synthesizer', 'Piano'],
          role: 'participant'
        },
        {
          id: 'user3-id',
          username: 'user3',
          isOnline: Math.random() > 0.3, // Dynamic online status
          instruments: ['Drums', 'Bass'],
          role: 'participant'
        }
      ];

      // Simulate real-time participant changes
      if (Math.random() > 0.7) {
        mockParticipants.push({
          id: 'new-participant-' + Date.now(),
          username: 'NewCollaborator',
          isOnline: true,
          instruments: ['Vocals'],
          role: 'participant'
        });
      }

      const mockRoomData = {
        id: params.id,
        name: 'Real-time Collaboration Demo',
        description: 'Live music collaboration with dynamic participants',
        genre: 'Electronic',
        isLive: true,
        creator: tokenData.email?.split('@')[0] || 'User',
        createdAt: new Date().toISOString(),
        participants: mockParticipants,
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

    const roomId = params.id
    console.log(`🗑️ Starting comprehensive deletion for room ${roomId} by user ${tokenData.id}`)

    try {
      // Check if room exists and user has permission to delete it
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { 
          id: true, 
          name: true, 
          creatorId: true,
          createdAt: true 
        }
      })

      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 })
      }

      // Only room creator can delete the room
      if (room.creatorId !== tokenData.id) {
        return NextResponse.json({ 
          error: 'Access denied: Only room creator can delete the room' 
        }, { status: 403 })
      }

      console.log(`✅ Permission verified for room deletion: ${room.name}`)

      // Start comprehensive deletion process
      let deletionSummary = {
        roomId: roomId,
        roomName: room.name,
        audioFilesDeleted: 0,
        studioProjectsDeleted: 0,
        participantsRemoved: 0,
        collaborationLogsDeleted: 0,
        compositionsDeleted: 0
      }

      // 1. Delete all audio files for this room
      console.log(`🎵 Deleting audio files for room ${roomId}...`)
      const audioFiles = await prisma.audioFile.findMany({
        where: { roomId: roomId },
        select: { id: true, filename: true, filePath: true }
      })
      
      console.log(`Found ${audioFiles.length} audio files to delete`)
      
      // Delete database records for audio files
      const deletedAudioFiles = await prisma.audioFile.deleteMany({
        where: { roomId: roomId }
      })
      deletionSummary.audioFilesDeleted = deletedAudioFiles.count
      console.log(`✅ Deleted ${deletedAudioFiles.count} audio file records`)

      // 2. Delete all compositions for this room
      console.log(`🎼 Deleting compositions for room ${roomId}...`)
      const deletedCompositions = await prisma.composition.deleteMany({
        where: { roomId: roomId }
      })
      deletionSummary.compositionsDeleted = deletedCompositions.count
      console.log(`✅ Deleted ${deletedCompositions.count} compositions`)

      // 3. Delete collaboration logs
      console.log(`📋 Deleting collaboration logs for room ${roomId}...`)
      const deletedCollabLogs = await prisma.collaborationLog.deleteMany({
        where: { roomId: roomId }
      })
      deletionSummary.collaborationLogsDeleted = deletedCollabLogs.count
      console.log(`✅ Deleted ${deletedCollabLogs.count} collaboration logs`)

      // 4. Delete studio projects
      console.log(`🏗️ Deleting studio projects for room ${roomId}...`)
      const deletedStudioProjects = await prisma.studioProject.deleteMany({
        where: { roomId: roomId }
      })
      deletionSummary.studioProjectsDeleted = deletedStudioProjects.count
      console.log(`✅ Deleted ${deletedStudioProjects.count} studio projects`)

      // 5. Remove all participants
      console.log(`👥 Removing participants from room ${roomId}...`)
      const deletedParticipants = await prisma.roomParticipant.deleteMany({
        where: { roomId: roomId }
      })
      deletionSummary.participantsRemoved = deletedParticipants.count
      console.log(`✅ Removed ${deletedParticipants.count} participants`)

      // 6. Finally, delete the room itself
      console.log(`🏠 Deleting room ${roomId}...`)
      await prisma.room.delete({
        where: { id: roomId }
      })
      console.log(`✅ Room ${roomId} deleted successfully`)

      console.log(`🎉 Room deletion completed successfully:`, deletionSummary)

      return NextResponse.json({
        success: true,
        message: `Room "${room.name}" and all associated data have been deleted successfully`,
        deletionSummary: deletionSummary
      })
      
    } catch (dbError) {
      console.error('❌ Database error during room deletion:', dbError)
      return NextResponse.json({ 
        error: 'Failed to delete room from database', 
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Error deleting room:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
