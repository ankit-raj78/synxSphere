import { NextRequest, NextResponse } from 'next/server'
import DatabaseManager from '@/lib/database'
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

    // Query for audio file
    const fileQuery = 'SELECT * FROM audio_files WHERE id = $1 AND user_id = $2'
    const result = await DatabaseManager.executeQuery(fileQuery, [params.id, user.id])
    
    console.log('Database query result:', result.rows.length, 'rows found')
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const audioFile = result.rows[0]
    console.log('Audio file path:', audioFile.file_path)

    try {
      const fileBuffer = await readFile(audioFile.file_path)
      console.log('File stream starting, size:', fileBuffer.length, 'bytes')
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': audioFile.mime_type || 'audio/wav',
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
