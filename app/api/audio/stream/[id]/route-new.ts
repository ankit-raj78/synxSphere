import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { readFile } from 'fs/promises'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Audio stream request for ID:', params.id)
    
    // Validate ID parameter
    if (!params.id || params.id === 'undefined') {
      console.error('Invalid ID parameter:', params.id)
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('User authenticated:', user.id, 'requesting file:', params.id)

    // Query for audio file using Prisma
    const audioFile = await prisma.audioFile.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })
    
    console.log('Database query result:', audioFile ? 'File found' : 'File not found')
    
    if (!audioFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    console.log('Audio file path:', audioFile.filePath)

    try {
      const fileBuffer = await readFile(audioFile.filePath)
      console.log('File stream starting, size:', fileBuffer.length, 'bytes')
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': audioFile.mimeType || 'audio/wav',
          'Content-Length': fileBuffer.length.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*'
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
