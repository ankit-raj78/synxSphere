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
  console.log('[Studio Project API] GET request received for room:', params.id)
  console.log('[Studio Project API] Request URL:', request.url)
  console.log('[Studio Project API] Request method:', request.method)
  
  try {
    const authHeader = request.headers.get('authorization')
    console.log('[Studio Project API] Auth header present:', !!authHeader)
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      console.log('[Studio Project API] No token provided')
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    console.log('[Studio Project API] Verifying token...')
    const tokenData = await verifyToken(token)
    if (!tokenData) {
      console.log('[Studio Project API] Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    console.log('[Studio Project API] Token verified for user:', tokenData.id)

    const roomId = params.id

    // Check if user has access to this room
    console.log('[Studio Project API] Checking room membership...')
    const membership = await DatabaseService.checkRoomMembership(roomId, tokenData.id)
    if (!membership.isMember) {
      console.log('[Studio Project API] User is not a member of room:', roomId)
      return NextResponse.json({ error: 'Access denied: Not a member of this room' }, { status: 403 })
    }
    console.log('[Studio Project API] User is a member, role:', membership.role)

    // Get the room's studio project
    console.log('[Studio Project API] Fetching studio project...')
    let studioProject = await DatabaseService.getRoomStudioProject(roomId)
    
    if (!studioProject) {
      console.log('[Studio Project API] No studio project found for room:', roomId, '- creating one')
      // Create a new studio project for this room
      studioProject = await DatabaseService.createStudioProject({
        userId: tokenData.id,
        roomId: roomId,
        name: `Studio Project for Room ${roomId}`,
        description: `Auto-created studio project for room collaboration`,
        projectData: { tempo: 120, timeSignature: { numerator: 4, denominator: 4 } }
      })
      console.log('[Studio Project API] Created new studio project:', studioProject.id)
    } else {
      console.log('[Studio Project API] Studio project found:', studioProject.id)
    }

    // Get all audio files for this room
    console.log('[Studio Project API] Fetching audio files...')
    const audioFiles = await DatabaseService.getRoomAudioFiles(roomId)
    console.log('[Studio Project API] Found', audioFiles.length, 'audio files')
    
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

    // Generate basic project data without heavy content
    console.log('[Studio Project API] Fetching room details...')
    const room = await DatabaseService.findRoomById(roomId)
    console.log('[Studio Project API] Room name:', room?.name)
    
    console.log('[Studio Project API] Creating lightweight project data...')
    // Create minimal project data instead of full OpenDAW project
    const basicProjectData = {
      name: room?.name || `test${roomId}`,
      roomId: roomId,
      tempo: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      tracks: formattedFiles.map(file => ({
        name: file.originalName,
        filePath: file.filePath,
        audioFileId: file.id,
        originalName: file.originalName
      }))
    }
    console.log('[Studio Project API] Basic project data created with', basicProjectData.tracks.length, 'tracks')

    // Include projectBundle if it exists
    let boxGraphData = null
    if (studioProject.projectBundle) {
      // Convert Buffer to array for JSON transmission
      boxGraphData = Array.from(studioProject.projectBundle)
      console.log('[Studio Project API] Including projectBundle:', boxGraphData.length, 'bytes')
    }

    // Return simplified response to avoid JSON size issues
    const response = {
      id: studioProject.id,
      name: studioProject.name,
      description: studioProject.description,
      projectData: basicProjectData,
      boxGraphData: boxGraphData, // Include the project bundle
      audioFiles: formattedFiles,
      audioFileCount: formattedFiles.length,
      roomId: studioProject.roomId,
      userId: studioProject.userId,
      createdAt: studioProject.createdAt,
      updatedAt: studioProject.updatedAt
    }
    
    console.log('[Studio Project API] Sending response with', response.audioFileCount, 'audio files')
    
    // Try to JSON.stringify to check for size issues before sending response
    try {
      const responseSize = JSON.stringify(response).length
      console.log('[Studio Project API] Response size:', responseSize, 'characters')
      
      if (responseSize > 1000000) { // 1MB limit
        console.warn('[Studio Project API] Response size is large, truncating audio file metadata')
        // Remove potentially large metadata fields
        response.audioFiles = response.audioFiles.map(file => ({
          id: file.id,
          filename: file.filename,
          originalName: file.originalName,
          filePath: file.filePath,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          duration: file.duration,
          sampleRate: file.sampleRate,
          channels: file.channels,
          format: file.format,
          metadata: null // Set to null to reduce size instead of removing the property
        }))
      }
      
      return NextResponse.json(response)
    } catch (stringifyError) {
      console.error('[Studio Project API] JSON stringify failed:', stringifyError)
      
      // Return minimal response if JSON fails
      return NextResponse.json({
        id: studioProject.id,
        name: studioProject.name,
        audioFiles: formattedFiles.map(f => ({
          id: f.id,
          originalName: f.originalName,
          filePath: f.filePath
        })),
        audioFileCount: formattedFiles.length,
        roomId: studioProject.roomId,
        error: 'Response too large, truncated'
      })
    }
  } catch (error) {
    console.error('[Studio Project API] Error fetching studio project:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('[Studio Project API] Error stack:', errorStack)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: errorMessage,
      roomId: params.id 
    }, { status: 500 })
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
    
    // Convert boxGraphData array back to Buffer if provided
    let projectBundle = undefined
    if (body.boxGraphData && Array.isArray(body.boxGraphData)) {
      projectBundle = Buffer.from(body.boxGraphData)
      console.log('[Studio Project API] Received boxGraphData:', projectBundle.length, 'bytes')
    }
    
    if (!studioProject) {
      // Create a new studio project if it doesn't exist
      const newProject = await DatabaseService.createStudioProject({
        userId: tokenData.id,
        roomId: roomId,
        name: body.name || `test${roomId}`,
        description: body.description,
        projectData: body.projectData || {},
        projectBundle: projectBundle
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
    const updateData: any = {
      projectData: body.projectData,
      name: body.name,
      description: body.description
    }
    
    // Include projectBundle if provided
    if (projectBundle) {
      updateData.projectBundle = projectBundle
    }
    
    const updatedProject = await DatabaseService.updateStudioProject(studioProject.id, updateData)

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