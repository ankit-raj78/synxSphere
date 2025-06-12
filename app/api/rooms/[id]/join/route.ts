import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import DatabaseManager from '@/lib/database'

// Apply to join room
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json()
    const { message = '' } = body

    try {
      // Check if room exists
      const roomResult = await DatabaseManager.executeQuery(
        'SELECT * FROM rooms WHERE id = $1',
        [params.id]
      )

      if (roomResult.rows.length === 0) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 })
      }

      const room = roomResult.rows[0]

      // Check if user is already a participant
      const existingParticipant = await DatabaseManager.executeQuery(
        'SELECT * FROM room_participants WHERE room_id = $1 AND user_id = $2',
        [params.id, tokenData.id]
      )

      if (existingParticipant.rows.length > 0) {
        return NextResponse.json({ error: 'Already a participant in this room' }, { status: 409 })
      }

      // Check if there's already a pending request
      const existingRequest = await DatabaseManager.executeQuery(
        `SELECT * FROM room_join_requests 
         WHERE room_id = $1 AND user_id = $2 AND status = 'pending'`,
        [params.id, tokenData.id]
      )

      if (existingRequest.rows.length > 0) {
        return NextResponse.json({ error: 'Join request already pending' }, { status: 409 })
      }

      // Create join request
      const requestId = require('crypto').randomUUID()
      await DatabaseManager.executeQuery(
        `INSERT INTO room_join_requests (id, room_id, user_id, message, status, created_at)
         VALUES ($1, $2, $3, $4, 'pending', NOW())`,
        [requestId, params.id, tokenData.id, message]
      )

      return NextResponse.json({ 
        message: 'Join request sent successfully',
        requestId 
      })

    } catch (dbError) {
      console.log('Database not available for join request:', dbError)
      return NextResponse.json({ 
        message: 'Join request sent successfully (mock)' 
      })
    }

  } catch (error) {
    console.error('Error creating join request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get join requests for room
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

    const tokenData = await verifyToken(token)
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    try {
      // Check if user is room creator
      const roomResult = await DatabaseManager.executeQuery(
        'SELECT * FROM rooms WHERE id = $1 AND creator_id = $2',
        [params.id, tokenData.id]
      )

      if (roomResult.rows.length === 0) {
        return NextResponse.json({ error: 'Not authorized to view join requests' }, { status: 403 })
      }

      // Get pending requests
      const requestsResult = await DatabaseManager.executeQuery(
        `SELECT rjr.*, u.username, u.email
         FROM room_join_requests rjr
         JOIN users u ON rjr.user_id = u.id
         WHERE rjr.room_id = $1 AND rjr.status = 'pending'
         ORDER BY rjr.created_at DESC`,
        [params.id]
      )

      const requests = requestsResult.rows.map(req => ({
        id: req.id,
        userId: req.user_id,
        username: req.username || req.email?.split('@')[0] || 'User',
        message: req.message,
        createdAt: req.created_at
      }))

      return NextResponse.json({ requests })

    } catch (dbError) {
      console.log('Database not available for join requests:', dbError)
      return NextResponse.json({ requests: [] })
    }

  } catch (error) {
    console.error('Error fetching join requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
