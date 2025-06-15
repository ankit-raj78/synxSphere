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
    }    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || 
                  new URL(request.url).searchParams.get('auth') // Support token in URL parameters
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }    console.log('User authenticated:', user.id, 'requesting file:', params.id)

    // Query for audio file - allow access if user owns it OR if it's in a room where user is a member
    const fileQuery = `
      SELECT af.*, r.id as room_id
      FROM audio_files af
      LEFT JOIN rooms r ON af.room_id = r.id
      LEFT JOIN room_participants rp ON r.id = rp.room_id AND rp.user_id = $2
      WHERE af.id = $1 AND (af.user_id = $2 OR rp.user_id IS NOT NULL)
    `
    const result = await DatabaseManager.executeQuery(fileQuery, [params.id, user.id])
    
    console.log('Database query result:', result.rows.length, 'rows found')
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 })
    }const audioFile = result.rows[0]
    console.log('Audio file path:', audioFile.file_path)

    try {
      const fileBuffer = await readFile(audioFile.file_path)
      console.log('File read successfully, size:', fileBuffer.length, 'bytes')
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': audioFile.mime_type || 'audio/wav',
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
