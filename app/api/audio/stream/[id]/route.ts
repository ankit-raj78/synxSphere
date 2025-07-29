import { NextRequest, NextResponse } from 'next/server'

// This route requires authentication and should not be statically generated
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'

import { verifyToken } from '@/lib/auth'

import { readFile } from 'fs/promises'

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  })
}


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('=== AUDIO STREAM REQUEST START ===')
  console.log('Audio stream request for ID:', params.id)
  console.log('Request URL:', request.url)
  console.log('Request headers:', Object.fromEntries(request.headers.entries()))
  console.log('Full params object:', params)
  
  try {
    
    // Validate ID parameter
    if (!params.id || params.id === 'undefined') {
      console.error('Invalid ID parameter:', params.id)
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 })
    }
    
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || 
                  new URL(request.url).searchParams.get('auth') // Support token in URL parameters
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    console.log('User authenticated:', user.id, 'requesting file:', params.id)

        // First, try to find the file in the AudioFile table (OpenDAW integration)
    let audioFile = await prisma.audioFile.findFirst({
      where: {
        id: params.id,
        OR: [
          { userId: user.id },
          {
            room: {
              participants: {
                some: {
                  userId: user.id
                }
              }
            }
          }
        ]
      },
      include: {
        room: true
      }
    })
    
    let filePath: string
    let mimeType: string
    let fileName: string
    
    if (audioFile) {
      console.log('File found in AudioFile table')
      filePath = audioFile.filePath
      mimeType = audioFile.mimeType
      fileName = audioFile.originalName || audioFile.filename
    } else {
      console.log('File not found in AudioFile table, checking audio_tracks table...')
      
      // If not found in AudioFile, try audio_tracks table (room collaboration system)
      const audioTrack = await prisma.audioTrack.findFirst({
        where: {
          id: params.id,
          room: {
            participants: {
              some: {
                userId: user.id
              }
            }
          }
        },
        include: {
          room: true
        }
      })
      
      if (audioTrack) {
        console.log('File found in audio_tracks table')
        filePath = audioTrack.filePath || ''
        // Determine mime type from file extension if not stored
        const extension = filePath.split('.').pop()?.toLowerCase()
        mimeType = extension === 'mp3' ? 'audio/mpeg' : 
                  extension === 'wav' ? 'audio/wav' :
                  extension === 'ogg' ? 'audio/ogg' :
                  extension === 'flac' ? 'audio/flac' : 'audio/wav'
        fileName = audioTrack.name
      } else {
        console.log('File not found in either AudioFile or audio_tracks tables')
        return NextResponse.json({ 
          error: 'File not found or access denied',
          details: `File ID ${params.id} not found in any audio table`
        }, { status: 404 })
      }
    }
    
    console.log('Audio file path from DB:', filePath)
    console.log('Detected mime type:', mimeType)
    console.log('File name:', fileName)
    
    // Handle path resolution for different upload formats
    let containerPath: string
    
    if (filePath.startsWith('/uploads/rooms/')) {
      // Room-specific uploads: /uploads/rooms/{roomId}/{filename}
      containerPath = `/app/public${filePath}`
    } else if (filePath.startsWith('/app/uploads/')) {
      // Direct app uploads: /app/uploads/{filename}
      containerPath = filePath
    } else if (filePath.startsWith('/uploads/')) {
      // General uploads: /uploads/{filename}
      containerPath = `/app/public${filePath}`
    } else {
      // Unsupported format
      console.error('Unsupported file path format:', filePath)
      return NextResponse.json({ 
        error: 'File path format not supported',
        details: `Unsupported path format: ${filePath}`
      }, { status: 400 })
    }
    
    console.log('Container file path:', containerPath)

    try {
      let fileBuffer: Buffer
      try {
        // First try the container path (for Docker environment)
        fileBuffer = await readFile(containerPath)
        console.log('File read successfully from path, size:', fileBuffer.length, 'bytes')
      } catch (pathError: any) {
        console.error('File not found at path:', containerPath)
        console.error('Path error details:', pathError.message)
        
        return NextResponse.json({ 
          error: 'File not accessible',
          details: `Physical file not found at path: ${containerPath}`,
          fileId: params.id,
          expectedPath: containerPath
        }, { status: 404 })
      }
      
      // Encode filename properly for Content-Disposition header
      const encodedFileName = encodeURIComponent(fileName)
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': mimeType || 'audio/wav',
          'Content-Length': fileBuffer.length.toString(),
          'Content-Disposition': `inline; filename*=UTF-8''${encodedFileName}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type'
        }
      })
    } catch (error: any) {
      console.error('Error reading audio file:', error)
      return NextResponse.json({ 
        error: 'File not accessible',
        details: error.message || 'Unknown error occurred while reading file'
      }, { status: 404 })
    }
  } catch (error: any) {
    console.error('=== AUDIO STREAM ERROR ===')
    console.error('Error streaming audio for ID:', params.id)
    console.error('Error details:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message || 'Unknown internal error occurred'
    }, { status: 500 })
  } finally {
    console.log('=== AUDIO STREAM REQUEST END ===')
  }
}
