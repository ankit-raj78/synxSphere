import { NextRequest, NextResponse } from 'next/server'
import DatabaseManager from '@/lib/database'
import { verifyToken } from '@/lib/auth'

// Mark route as dynamic since it requires request headers
export const dynamic = 'force-dynamic'

// Mark route as server-side only
export const runtime = 'nodejs'

export async function PATCH(
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

    const fileId = params.id
    const body = await request.json()
    const { room_id } = body

    // Verify the user owns this file
    const fileQuery = 'SELECT * FROM audio_files WHERE id = $1 AND user_id = $2'
    const fileResult = await DatabaseManager.executeQuery(fileQuery, [fileId, user.id])
    
    if (fileResult.rows.length === 0) {
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 })
    }

    // If room_id is provided, verify user is a member of that room
    if (room_id) {
      const membershipQuery = `
        SELECT r.id 
        FROM rooms r 
        JOIN room_participants rp ON r.id = rp.room_id 
        WHERE r.id = $1 AND rp.user_id = $2
      `
      const membershipResult = await DatabaseManager.executeQuery(membershipQuery, [room_id, user.id])
      
      if (membershipResult.rows.length === 0) {
        return NextResponse.json({ error: 'Access denied: Not a member of this room' }, { status: 403 })
      }
    }

    // Update the file's room association
    const updateQuery = `
      UPDATE audio_files 
      SET room_id = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `
    const result = await DatabaseManager.executeQuery(updateQuery, [room_id, fileId, user.id])
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
