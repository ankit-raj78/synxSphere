import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { DatabaseService } from '@/lib/prisma'
import { createDefaultOpenDAWProjectData } from '@/lib/audio-utils'

export const dynamic = 'force-dynamic'

// GET the studio project for a room
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

    const roomId = params.id

    // Check if user has access to this room
    const membership = await DatabaseService.checkRoomMembership(roomId, tokenData.id)
    if (!membership.isMember) {
      return NextResponse.json({ error: 'Access denied: Not a member of this room' }, { status: 403 })
    }

    // Get the room's studio project
    const studioProject = await DatabaseService.getRoomStudioProject(roomId)
    
    if (!studioProject) {
      return NextResponse.json({ error: 'No studio project found for this room' }, { status: 404 })
    }

    // Get all audio files for this room
    const audioFiles = await DatabaseService.getRoomAudioFiles(roomId)
    
    // Convert to the format expected by OpenDAW
    const formattedFiles = audioFiles.map(file => ({
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      filePath: file.filePath,
      fileSize: Number(file.fileSize),
      mimeType: file.mimeType,
      duration: Number(file.duration) || 0,
      sampleRate: file.sampleRate,
      channels: file.channels,
      format: file.format,
      metadata: file.metadata
    }))

    // Generate updated project data with all room audio files as tracks
    const room = await DatabaseService.findRoomById(roomId)
    const enhancedProjectData = createDefaultOpenDAWProjectData(
      room?.name || 'Room Project',
      roomId,
      undefined, // No default audio file
      formattedFiles // All room audio files
    )

    // Return the project with enhanced data including all audio files
    return NextResponse.json({
      ...studioProject,
      projectData: enhancedProjectData,
      audioFiles: formattedFiles,
      audioFileCount: formattedFiles.length
    })
  } catch (error) {
    console.error('Error fetching studio project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update the studio project for a room
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

    const roomId = params.id
    const body = await request.json()

    // Check if user has access to this room
    const membership = await DatabaseService.checkRoomMembership(roomId, tokenData.id)
    if (!membership.isMember) {
      return NextResponse.json({ error: 'Access denied: Not a member of this room' }, { status: 403 })
    }

    // Get the existing studio project
    const studioProject = await DatabaseService.getRoomStudioProject(roomId)
    
    if (!studioProject) {
      // Create a new studio project if it doesn't exist
      const newProject = await DatabaseService.createStudioProject({
        userId: tokenData.id,
        roomId: roomId,
        name: body.name || `Room ${roomId} Project`,
        description: body.description,
        projectData: body.projectData || {}
      })
      
      // Return only essential fields to avoid JSON.stringify size limits
      return NextResponse.json({
        id: newProject.id,
        name: newProject.name,
        description: newProject.description,
        roomId: newProject.roomId,
        userId: newProject.userId,
        createdAt: newProject.createdAt,
        updatedAt: newProject.updatedAt,
        success: true
      })
    }

    // Update the existing project
    const updatedProject = await DatabaseService.updateStudioProject(studioProject.id, {
      projectData: body.projectData,
      name: body.name,
      description: body.description
    })

    // Return minimal response to avoid any JSON.stringify issues
    // Avoid accessing any potentially large fields like projectData or projectBundle
    return NextResponse.json({
      id: updatedProject.id,
      name: updatedProject.name,
      description: updatedProject.description,
      roomId: updatedProject.roomId,
      userId: updatedProject.userId,
      createdAt: updatedProject.createdAt,
      updatedAt: updatedProject.updatedAt,
      success: true
    })
  } catch (error) {
    console.error('Error updating studio project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}