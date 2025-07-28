import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { DatabaseService } from '@/lib/prisma'
import { readFile } from 'fs/promises'

export const dynamic = 'force-dynamic'

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

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const fileId = params.id
    console.log(`[Audio Download] Fetching file: ${fileId} for user: ${user.id}`)

    // Get file metadata from database
    const audioFile = await DatabaseService.findAudioFileById(fileId)
    if (!audioFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Check if user has access to this file
    if (audioFile.userId !== user.id) {
      // If it's a room file, check room membership
      if (audioFile.roomId) {
        const membership = await DatabaseService.checkRoomMembership(audioFile.roomId, user.id)
        if (!membership.isMember) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      } else {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Read the file from disk
    const fileBuffer = await readFile(audioFile.filePath)
    
    console.log(`[Audio Download] Successfully serving file: ${audioFile.originalName} (${fileBuffer.length} bytes)`)

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': audioFile.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${audioFile.originalName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600' // Cache for 1 hour
      }
    })

  } catch (error) {
    console.error('[Audio Download] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
