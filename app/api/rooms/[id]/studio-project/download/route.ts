import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { DatabaseService } from '@/lib/prisma'
import { createDefaultOpenDAWProjectData, generateOpenDAWBundle } from '@/lib/audio-utils'

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

// GET - Download the studio project bundle (.odb file) for a room
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Studio Project Download] GET request received for room:', params.id)
  
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401, headers: corsHeaders })
    }

    const tokenData = await verifyToken(token)
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders })
    }

    const roomId = params.id

    // Check if user has access to this room
    const membership = await DatabaseService.checkRoomMembership(roomId, tokenData.id)
    if (!membership.isMember) {
      return NextResponse.json({ error: 'Access denied: Not a member of this room' }, { status: 403, headers: corsHeaders })
    }

    // Get room details
    const room = await DatabaseService.findRoomById(roomId)
    const projectName = room?.name || `Room ${roomId} Project`
    
    // Get all audio files for this room
    console.log('[Studio Project Download] Fetching audio files...')
    const audioFiles = await DatabaseService.getRoomAudioFiles(roomId)
    console.log('[Studio Project Download] Found', audioFiles.length, 'audio files')
    
    if (audioFiles.length === 0) {
      return NextResponse.json({ error: 'No audio files found in this room' }, { status: 404, headers: corsHeaders })
    }
    
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
    
    // Create OpenDAW project data
    const openDAWProjectData = createDefaultOpenDAWProjectData(
      projectName,
      roomId,
      undefined, // No single default file
      formattedAudioFiles // All files as tracks
    )
    
    // Create OpenDAW bundle with embedded audio files
    console.log('[Studio Project Download] Creating OpenDAW bundle with embedded audio files...')
    const projectBundle = await generateOpenDAWBundle(
      roomId,
      openDAWProjectData,
      formattedAudioFiles
    )
    
    console.log('[Studio Project Download] OpenDAW bundle created, size:', projectBundle.length, 'bytes')
    
    // Return the bundle as a downloadable file
    const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_project.odb`
    
    return new NextResponse(projectBundle, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': projectBundle.length.toString()
      }
    })
    
  } catch (error) {
    console.error('[Studio Project Download] Error creating project bundle:', error)
    return NextResponse.json({
      error: 'Failed to create project bundle',
      details: (error as Error)?.message,
    }, { status: 500, headers: corsHeaders })
  }
}
