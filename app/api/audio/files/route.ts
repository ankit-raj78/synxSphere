import { NextRequest, NextResponse } from 'next/server'
import DatabaseManager from '@/lib/database'
import { verifyToken } from '@/lib/auth'

// Mark route as dynamic since it requires request headers
export const dynamic = 'force-dynamic'

// Mark route as server-side only
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Query for user's audio files
    const filesQuery = 'SELECT * FROM audio_files WHERE user_id = $1 ORDER BY created_at DESC'
    const result = await DatabaseManager.executeQuery(filesQuery, [user.id])
    
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching audio files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
