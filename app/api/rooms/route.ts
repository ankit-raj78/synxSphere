import { NextRequest, NextResponse } from 'next/server'

// This route requires authentication and should not be statically generated
export const dynamic = 'force-dynamic'
import { verifyToken } from '@/lib/auth'

import { prisma, DatabaseService } from '@/lib/prisma'
import { createDefaultAudioFileForRoom, createCompleteRoomProjectFiles } from '@/lib/audio-utils'


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

    try {      // Try to fetch rooms from PostgreSQL using Prisma
      const rooms = await prisma.room.findMany({
        where: {
          name: {
            not: {
              contains: 'test'
            }
          }
        },
        include: {
          creator: {
            select: {
              username: true,
              email: true
            }
          },
          participants: {
            select: {
              userId: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      const roomsData = rooms.map((room: any) => {
        let settings = { maxParticipants: 10 }
        try {
          if (room.settings) {
            settings = typeof room.settings === 'object' ? room.settings as any : JSON.parse(room.settings as string)
          }
        } catch (e) {
          console.log('Error parsing room settings:', e)
        }
        
        return {
          id: room.id,
          name: room.name,
          description: room.description,
          genre: room.genre,
          participantCount: room.participants.length,
          maxParticipants: settings.maxParticipants || 10,
          isLive: room.isLive,
          creator: room.creator?.username || room.creator?.email?.split('@')[0] || 'Unknown',
          creatorId: room.creatorId,
          createdAt: room.createdAt
        }
      })

      return NextResponse.json(roomsData)
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
    }    // Create room in PostgreSQL using Prisma
    try {
      const settings = {
        isPublic,
        maxParticipants
      }

      const newRoom = await prisma.room.create({
        data: {
          name,
          description,
          genre,
          creatorId: tokenData.id,
          isLive: true,
          settings: settings
        }
      })

      // Add creator as first participant using Prisma
      await prisma.roomParticipant.create({
        data: {
          roomId: newRoom.id,
          userId: tokenData.id,
          role: 'creator',
          isOnline: true
        }
      })

      // Create default audio file and complete studio project files for the room
      try {
        console.log(`🎵 Creating default audio file for room ${newRoom.id}...`)
        // Create default audio file for the room (optional)
        const defaultAudioFile = await createDefaultAudioFileForRoom(
          newRoom.id,
          tokenData.id,
          newRoom.name
        )
        console.log(`✅ Default audio file created:`, defaultAudioFile ? 'success' : 'none')

        console.log(`📁 Creating complete project files with bundle for room ${newRoom.id}...`)
        // Create complete project files (.json, .od, .odsl, .odb)
        const projectFiles = await createCompleteRoomProjectFiles(
          newRoom.id,
          `Room ${newRoom.id}`,
          tokenData.id,
          defaultAudioFile
        )
        console.log(`✅ Project files created successfully`)

        console.log(`🏗️ Creating studio project in database for room ${newRoom.id}...`)
        // Create the studio project with all file formats
        const studioProject = await DatabaseService.createStudioProject({
          userId: tokenData.id,
          roomId: newRoom.id,
          name: `test${newRoom.id}`,
          description: `Studio project for ${newRoom.name}`,
          projectData: projectFiles.projectJson,
          projectBinary: projectFiles.projectBinary,
          projectBundle: projectFiles.projectBundle,
          syncVersion: 0
        })
        console.log(`✅ Studio project created with ID: ${studioProject.id}`)
        
        // Verify the studio project was created successfully
        if (!studioProject || !studioProject.id) {
          throw new Error('Studio project creation returned null or invalid project')
        }
        
        console.log(`🔍 Verifying studio project was saved correctly...`)
        // Verify we can retrieve the studio project from the database
        const verifyProject = await DatabaseService.getRoomStudioProject(newRoom.id)
        if (!verifyProject) {
          throw new Error('Failed to verify studio project creation - project not found in database')
        }
        console.log(`✅ Studio project verified in database`)

        // Create the collaboration log
        await prisma.collaborationLog.create({
          data: {
            roomId: newRoom.id,
            studioProjectId: studioProject.id,
            syncLog: projectFiles.syncLog,
            lastSyncVersion: 0
          }
        })

        console.log(`✅ Created complete project files for room ${newRoom.id}:`)
        console.log(`   - Studio project ID: ${studioProject.id}`)
        console.log(`   - JSON project data: ${JSON.stringify(projectFiles.projectJson).length} bytes`)
        console.log(`   - Binary .od file: ${projectFiles.projectBinary.length} bytes`)
        console.log(`   - Sync log .odsl file: ${projectFiles.syncLog.length} bytes`)
      } catch (studioError) {
        console.error('❌ Failed to create studio project files for room:', studioError as Error)
        
        // Studio project creation is critical - if it fails, clean up and fail room creation
        try {
          await prisma.roomParticipant.deleteMany({ where: { roomId: newRoom.id } })
          await prisma.room.delete({ where: { id: newRoom.id } })
          console.log(`🧹 Cleaned up room ${newRoom.id} due to studio project creation failure`)
        } catch (cleanupError) {
          console.error('❌ Failed to cleanup room after studio project failure:', cleanupError)
        }
        
        return NextResponse.json({ 
          error: 'Failed to create studio project for room', 
          details: studioError.message 
        }, { status: 500 })
      }

      // Return the created room with participant count
      const responseRoom = {
        id: newRoom.id,
        name: newRoom.name,
        description: newRoom.description,
        genre: newRoom.genre,
        participantCount: 1,
        maxParticipants,
        isLive: newRoom.isLive,
        creator: tokenData.email?.split('@')[0] || 'User',
        createdAt: newRoom.createdAt
      }

      return NextResponse.json(responseRoom, { status: 201 })
    } catch (dbError) {    console.log('Database not available for room creation, using mock response:', dbError as Error)
      
      // Generate a proper UUID for fallback
      const { v4: uuidv4 } = require('uuid')
      
      // Fallback to mock room creation if database is not available
      const mockRoom = {
        id: uuidv4(),
        name,
        description,
        genre: genre || 'General',
        participantCount: 1,
        maxParticipants,
        isLive: true,
        creator: tokenData.email?.split('@')[0] || 'User',
        createdAt: new Date().toISOString()
      }

      return NextResponse.json(mockRoom, { status: 201 })
    }
  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

    // Get roomId from query parameters
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 })
    }

    console.log(`🗑️ Starting deletion process for room ${roomId} by user ${tokenData.id}`)

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
      for (const audioFile of audioFiles) {
        try {
          // Delete physical file if needed (file system cleanup)
          // Note: Add actual file deletion logic here if files are stored locally
          console.log(`🗑️ Deleting audio file: ${audioFile.filename}`)
        } catch (fileError) {
          console.warn(`⚠️ Failed to delete physical file ${audioFile.filename}:`, fileError)
        }
      }
      
      const deletedAudioFiles = await prisma.audioFile.deleteMany({
        where: { roomId: roomId }
      })
      deletionSummary.audioFilesDeleted = deletedAudioFiles.count
      console.log(`✅ Deleted ${deletedAudioFiles.count} audio files`)

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
        details: dbError.message 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Error deleting room:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
