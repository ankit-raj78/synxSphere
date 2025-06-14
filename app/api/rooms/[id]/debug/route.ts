import { NextRequest, NextResponse } from 'next/server'
import DatabaseManager from '@/lib/database'
import { verifyToken } from '@/lib/auth'

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

    // Get room info
    const roomQuery = 'SELECT * FROM rooms WHERE id = $1'
    const roomResult = await DatabaseManager.executeQuery(roomQuery, [roomId])
    
    // Get room participants
    const participantsQuery = `
      SELECT rp.*, u.username, u.email 
      FROM room_participants rp 
      JOIN users u ON rp.user_id = u.id 
      WHERE rp.room_id = $1
    `
    const participantsResult = await DatabaseManager.executeQuery(participantsQuery, [roomId])
    
    // Get room files
    const filesQuery = `
      SELECT af.*, u.username as uploader_name
      FROM audio_files af
      JOIN users u ON af.user_id = u.id
      WHERE af.room_id = $1 OR af.user_id IN (
        SELECT rp.user_id FROM room_participants rp WHERE rp.room_id = $1
      )
      ORDER BY af.created_at DESC
    `
    const filesResult = await DatabaseManager.executeQuery(filesQuery, [roomId])
    
    // Check current user membership
    const membershipQuery = `
      SELECT * FROM room_participants 
      WHERE room_id = $1 AND user_id = $2
    `
    const membershipResult = await DatabaseManager.executeQuery(membershipQuery, [roomId, user.id])
    
    return NextResponse.json({
      room: roomResult.rows[0] || null,
      participants: participantsResult.rows,
      files: filesResult.rows,
      currentUserMembership: membershipResult.rows[0] || null,
      currentUserId: user.id
    })
  } catch (error) {
    console.error('Error debugging room:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
