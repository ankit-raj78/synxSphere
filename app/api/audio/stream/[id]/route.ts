import { NextRequest, NextResponse } from 'next/server'
import DatabaseManager from '@/lib/database'
import { verifyToken } from '@/lib/auth'
import { readFile } from 'fs/promises'

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
    }    // Query for audio file
    const fileQuery = 'SELECT * FROM audio_files WHERE id = $1 AND user_id = $2'
    const result = await DatabaseManager.executeQuery(fileQuery, [params.id, user.id])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const audioFile = result.rows[0]

    try {
      const fileBuffer = await readFile(audioFile.file_path)
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': audioFile.mime_type || 'audio/mpeg',
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600'
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
