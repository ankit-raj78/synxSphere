import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { DatabaseService } from '@/lib/prisma'
import { createDefaultOpenDAWProjectData } from '@/lib/audio-utils'

export const dynamic = 'force-dynamic'

// CORS headers for OpenDAW Studio integration
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://localhost:8080',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
}

// Handle preflight OPTIONS request
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

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
      return NextResponse.json({ error: 'No token provided' }, { status: 401, headers: corsHeaders })
    }

    console.log('[Studio Project API] Verifying token...')
    const tokenData = await verifyToken(token)
    if (!tokenData) {
      console.log('[Studio Project API] Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders })
    }
    console.log('[Studio Project API] Token verified for user:', tokenData.id)

    const roomId = params.id

    // Check if user has access to this room
    console.log('[Studio Project API] Checking room membership...')
    const membership = await DatabaseService.checkRoomMembership(roomId, tokenData.id)
    if (!membership.isMember) {
      console.log('[Studio Project API] User is not a member of room:', roomId)
      return NextResponse.json({ error: 'Access denied: Not a member of this room' }, { status: 403, headers: corsHeaders })
    }
    console.log('[Studio Project API] User is a member, role:', membership.role)

    // Get the room's studio project
    console.log('[Studio Project API] Fetching studio project...')
    let studioProject = await DatabaseService.getRoomStudioProject(roomId)
    
    // Get room details for project naming
    const room = await DatabaseService.findRoomById(roomId)
    const projectName = room?.name || `Room ${roomId} Project`
    
    if (!studioProject) {
      console.log('[Studio Project API] No studio project found for room:', roomId, '- creating default OpenDAW project')
      
      // Get all audio files for this room
      console.log('[Studio Project API] Fetching audio files for OpenDAW project creation...')
      const audioFiles = await DatabaseService.getRoomAudioFiles(roomId)
      console.log('[Studio Project API] Found', audioFiles.length, 'audio files')
      
      // Convert audio files to the format expected by createDefaultOpenDAWProjectData
      const formattedAudioFiles = audioFiles.map(file => ({
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        filePath: file.filePath,
        fileSize: Number(file.fileSize),
        mimeType: file.mimeType,
        duration: Number(file.duration) || 0,
        metadata: file.metadata || {}
      }))
      
      // Create OpenDAW project data with all audio files as tracks
      console.log('[Studio Project API] Creating OpenDAW project with', formattedAudioFiles.length, 'tracks')
      const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`
      const openDAWProjectData = createDefaultOpenDAWProjectData(
        projectName,
        roomId,
        undefined, // No single default file
        formattedAudioFiles, // All files as tracks
        baseUrl // Base URL for audio streaming
      )
      
      console.log('[Studio Project API] Returning OpenDAW project with tracks:', openDAWProjectData.tracks?.length)
      return NextResponse.json({
        id: `room-${roomId}`,
        name: projectName,
        data: {
          type: 'opendaw-serialized-project',
          roomId: roomId,
          projectName: projectName,
          projectData: openDAWProjectData,
          audioFiles: formattedAudioFiles, // Include for reference
          authConfig: {
            requiresAuth: true,
            authType: 'bearer',
            authEndpoint: `${baseUrl}/api/auth/verify`
          }
        }
      }, { headers: corsHeaders })
    } else {
      console.log('[Studio Project API] Studio project found:', studioProject.id)
      
      // Check if the project has serialized OpenDAW data in the correct format
      if (studioProject.projectData && 
          typeof studioProject.projectData === 'object' && 
          !Array.isArray(studioProject.projectData) &&
          ((studioProject.projectData as any).type === 'opendaw-serialized-project' || 
           (studioProject.projectData as any).type === 'room-audio-files')) {
        // Return the collaboration format expected by CollaborativeOpfsAgent
        console.log('[Studio Project API] Returning existing project with valid collaboration data')
        return NextResponse.json({
          id: studioProject.id,
          name: studioProject.name,
          data: studioProject.projectData
        }, { headers: corsHeaders })
      } else {
        // Project exists but no valid collaboration data - create OpenDAW project
        console.log('[Studio Project API] Studio project exists but no valid collaboration data, creating OpenDAW project')
        
        // Get all audio files for this room
        const audioFiles = await DatabaseService.getRoomAudioFiles(roomId)
        const formattedAudioFiles = audioFiles.map(file => ({
          id: file.id,
          filename: file.filename,
          originalName: file.originalName,
          filePath: file.filePath,
          fileSize: Number(file.fileSize),
          mimeType: file.mimeType,
          duration: Number(file.duration) || 0,
          metadata: file.metadata || {}
        }))
        
        // Create OpenDAW project data with all audio files as tracks
        const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`
        const openDAWProjectData = createDefaultOpenDAWProjectData(
          studioProject.name,
          roomId,
          undefined, // No single default file
          formattedAudioFiles, // All files as tracks
          baseUrl // Base URL for audio streaming
        )
        
        return NextResponse.json({
          id: studioProject.id,
          name: studioProject.name,
          data: {
            type: 'opendaw-serialized-project',
            roomId: roomId,
            projectName: studioProject.name,
            projectData: openDAWProjectData,
            audioFiles: formattedAudioFiles,
            authConfig: {
              requiresAuth: true,
              authType: 'bearer',
              authEndpoint: `${baseUrl}/api/auth/verify`
            }
          }
        }, { headers: corsHeaders })
      }
    }
  } catch (error) {
    console.error('[Studio Project API] Error fetching studio project:', error)
    console.error('[Studio Project API] Error stack:', (error as Error)?.stack);
    return NextResponse.json({
      error: 'Failed to retrieve studio project data',
      details: (error as Error)?.message,
    }, { status: 500, headers: corsHeaders });
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
        name: body.name || `test${roomId}`,
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