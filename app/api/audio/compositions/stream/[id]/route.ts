import { NextRequest, NextResponse } from 'next/server'
import DatabaseManager from '@/lib/database'
import { verifyToken } from '@/lib/auth'
import fs from 'fs'
import { join } from 'path'

// Mark route as dynamic
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

    const compositionId = params.id

    // Get composition from database
    const query = 'SELECT * FROM compositions WHERE id = $1 AND user_id = $2'
    const result = await DatabaseManager.executeQuery(query, [compositionId, user.id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Composition not found' }, { status: 404 })
    }

    const composition = result.rows[0]
    const filePath = composition.file_path

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Composition file not found' }, { status: 404 })
    }

    // Read the file
    const fileBuffer = fs.readFileSync(filePath)
    
    // Return the audio file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': composition.mime_type,
        'Content-Length': composition.file_size.toString(),
        'Cache-Control': 'public, max-age=3600',
        'Content-Disposition': `inline; filename="${composition.filename}"`
      }
    })
  } catch (error) {
    console.error('Error streaming composition:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
