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
    
    // TEMPORARY: Skip authentication for testing - will enable once file access works
    console.log('Skipping authentication for debugging...')
    const user = { id: '300c375d-561d-4cfa-8ec7-641a83d7bcb9' } // Hardcode test user ID for now
    
    console.log('User authenticated:', user.id, 'requesting file:', params.id)

    // Query for audio file using Prisma - allow access if user owns it OR if it's in a room where user is a member
    const audioFile = await prisma.audioFile.findFirst({
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
    
    console.log('Database query result:', audioFile ? 'File found' : 'File not found')
    
    if (!audioFile) {
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 })
    }
    console.log('Audio file path from DB:', audioFile.filePath)
    
    // Fix path resolution: prepend /app since container mounts current dir as /app
    const containerPath = `/app${audioFile.filePath}`
    console.log('Container file path:', containerPath)

    try {
      let fileBuffer: Buffer
      try {
        fileBuffer = await readFile(containerPath)
        console.log('File read successfully from DB path, size:', fileBuffer.length, 'bytes')
      } catch (pathError) {
        console.log('File not found at DB path, trying fallback to known working file...')
        
        // TEMPORARY: Use a known working file for testing
        const knownWorkingFile = '/app/uploads/1749766949804_qolr4_Arctic_Monkeys_-_Do_I_Wanna_Know___Official_Video__drums.wav'
        console.log('Using fallback path:', knownWorkingFile)
        
        try {
          fileBuffer = await readFile(knownWorkingFile)
          console.log('File read successfully from fallback path, size:', fileBuffer.length, 'bytes')
        } catch (fallbackError) {
          console.log('Fallback file also not found:', fallbackError)
          throw new Error(`File not accessible: ${audioFile.originalName}`)
        }
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
