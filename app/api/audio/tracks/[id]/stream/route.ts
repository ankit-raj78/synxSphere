import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Audio track stream request for ID:', params.id)
    
    // Validate ID parameter
    if (!params.id || params.id === 'undefined') {
      console.error('Invalid ID parameter:', params.id)
      return NextResponse.json({ error: 'Invalid track ID' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || 
                  new URL(request.url).searchParams.get('auth') // Support token in URL parameters
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('User authenticated:', user.id, 'requesting track:', params.id)

    // Query for audio track using Prisma - allow access if user is a member of the room
    const audioTrack = await prisma.audioTrack.findFirst({
      where: {
        id: params.id,
        room: {
          OR: [
            { creatorId: user.id },
            {
              participants: {
                some: {
                  userId: user.id
                }
              }
            }
          ]
        }
      },
      include: {
        room: true
      }
    })

    if (!audioTrack) {
      console.log('Track not found or user not authorized for track:', params.id)
      return NextResponse.json({ error: 'Track not found or unauthorized' }, { status: 404 })
    }

    console.log('Track found:', audioTrack.id, 'filePath:', audioTrack.filePath)

    if (!audioTrack.filePath) {
      console.log('Track has no file path:', audioTrack.id)
      return NextResponse.json({ error: 'Track file not available' }, { status: 404 })
    }

    // Read the file
    const fullPath = path.join(process.cwd(), 'public', audioTrack.filePath)
    console.log('Reading file from:', fullPath)
    
    try {
      const fileBuffer = await readFile(fullPath)
      
      // Determine MIME type based on file extension
      const extension = path.extname(audioTrack.filePath).toLowerCase()
      let mimeType = 'audio/mpeg' // default
      
      switch (extension) {
        case '.mp3':
          mimeType = 'audio/mpeg'
          break
        case '.wav':
          mimeType = 'audio/wav'
          break
        case '.flac':
          mimeType = 'audio/flac'
          break
        case '.m4a':
          mimeType = 'audio/mp4'
          break
        case '.ogg':
          mimeType = 'audio/ogg'
          break
      }

      console.log('Serving file:', audioTrack.filePath, 'mime type:', mimeType, 'size:', fileBuffer.length)

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000',
          'Accept-Ranges': 'bytes'
        }
      })
    } catch (fileError) {
      console.error('Error reading file:', fileError)
      return NextResponse.json({ error: 'File not accessible' }, { status: 404 })
    }

  } catch (error) {
    console.error('Error streaming track:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
