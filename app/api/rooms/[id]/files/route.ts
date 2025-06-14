import { NextRequest, NextResponse } from 'next/server'
import DatabaseManager from '@/lib/database'
import { verifyToken } from '@/lib/auth'

// Mark route as dynamic since it requires request headers
export const dynamic = 'force-dynamic'

// Mark route as server-side only
export const runtime = 'nodejs'

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

    const roomId = params.id

    // Verify user is a member of this room
    const membershipQuery = `
      SELECT r.id, r.name, rp.user_id, rp.role 
      FROM rooms r 
      JOIN room_participants rp ON r.id = rp.room_id 
      WHERE r.id = $1 AND rp.user_id = $2
    `
    const membershipResult = await DatabaseManager.executeQuery(membershipQuery, [roomId, user.id])
    
    if (membershipResult.rows.length === 0) {
      return NextResponse.json({ error: 'Access denied: Not a member of this room' }, { status: 403 })
    }

    // Get all files uploaded to this room by all participants
    const filesQuery = `
      SELECT 
        af.*,
        u.username as uploader_name
      FROM audio_files af
      JOIN users u ON af.user_id = u.id
      WHERE af.room_id = $1
      ORDER BY af.created_at DESC
    `
    const result = await DatabaseManager.executeQuery(filesQuery, [roomId])
    
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching room files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
