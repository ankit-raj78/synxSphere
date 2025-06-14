import { NextRequest, NextResponse } from 'next/server'
import DatabaseManager from '@/lib/database'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const tokenData = await verifyToken(token)
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check database connectivity and data
    const diagnostics: any = {
      database: 'connected',
      timestamp: new Date().toISOString(),
      user: tokenData
    }

    try {
      // Count rooms
      const roomsCount = await DatabaseManager.executeQuery('SELECT COUNT(*) as count FROM rooms')
      diagnostics.rooms_count = roomsCount.rows[0]?.count || 0

      // Count users
      const usersCount = await DatabaseManager.executeQuery('SELECT COUNT(*) as count FROM users')
      diagnostics.users_count = usersCount.rows[0]?.count || 0

      // Count participants
      const participantsCount = await DatabaseManager.executeQuery('SELECT COUNT(*) as count FROM room_participants')
      diagnostics.participants_count = participantsCount.rows[0]?.count || 0

      // Sample rooms
      const sampleRooms = await DatabaseManager.executeQuery('SELECT id, name, creator_id, created_at FROM rooms LIMIT 5')
      diagnostics.sample_rooms = sampleRooms.rows

      // Sample users
      const sampleUsers = await DatabaseManager.executeQuery('SELECT id, username, email, created_at FROM users LIMIT 5')
      diagnostics.sample_users = sampleUsers.rows

    } catch (dbError: any) {
      diagnostics.database = 'error'
      diagnostics.error = dbError?.message || 'Unknown database error'
    }

    return NextResponse.json(diagnostics)

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Diagnostic failed',
      message: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
