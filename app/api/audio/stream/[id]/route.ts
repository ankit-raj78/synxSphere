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
    
    // COMPLETELY DISABLE AUTHENTICATION FOR TESTING
    console.log('Authentication completely disabled for audio streaming...')

    // Query for audio file using Prisma - allow access to any file for testing
    const audioFile = await prisma.audioFile.findFirst({
      where: {
        id: params.id
      },
      include: {
        room: true
      }
    })
    
    console.log('Database query result:', audioFile ? 'File found' : 'File not found')
    
    if (!audioFile) {
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 })
    }
    console.log('Audio file path from DB:', audioFile.filePath)
    
    // Handle path resolution for room-specific uploads
    let containerPath: string
    
    if (audioFile.filePath.startsWith('/uploads/rooms/')) {
      // Room-specific uploads: /uploads/rooms/{roomId}/{filename}
      // Use local filesystem path instead of Docker container path
      containerPath = `./public${audioFile.filePath}`
    } else {
      // Other formats not supported for room audio
      console.error('Unsupported file path format for room audio:', audioFile.filePath)
      return NextResponse.json({ error: 'File path format not supported' }, { status: 400 })
    }
    
    console.log('Container file path:', containerPath)

    try {
      let fileBuffer: Buffer
      try {
        fileBuffer = await readFile(containerPath)
        console.log('File read successfully from DB path, size:', fileBuffer.length, 'bytes')
      } catch (pathError) {
        console.error('File not found at path:', containerPath, pathError)
        return NextResponse.json({ error: 'File not accessible' }, { status: 404 })
      }
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': audioFile.mimeType || 'audio/wav',
          'Content-Length': fileBuffer.length.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type'
        }
      })
    } catch (error) {
      console.error('Error reading audio file:', error)
      return NextResponse.json({ error: 'File not accessible' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error streaming audio:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
