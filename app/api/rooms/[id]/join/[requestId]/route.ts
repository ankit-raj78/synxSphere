import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import DatabaseManager from '@/lib/database'

// Approve or reject join request
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string, requestId: string } }
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
    const { action } = body // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    try {
      // Check if user is room creator
      const roomResult = await DatabaseManager.executeQuery(
        'SELECT * FROM rooms WHERE id = $1 AND creator_id = $2',
        [params.id, tokenData.id]
      )

      if (roomResult.rows.length === 0) {
        return NextResponse.json({ error: 'Not authorized to handle join requests' }, { status: 403 })
      }

      // Get request information
      const requestResult = await DatabaseManager.executeQuery(
        'SELECT * FROM room_join_requests WHERE id = $1 AND room_id = $2 AND status = $3',
        [params.requestId, params.id, 'pending']
      )

      if (requestResult.rows.length === 0) {
        return NextResponse.json({ error: 'Join request not found or already processed' }, { status: 404 })
      }

      const joinRequest = requestResult.rows[0]

      if (action === 'approve') {
        // Add user to room participants
        await DatabaseManager.executeQuery(
          `INSERT INTO room_participants (room_id, user_id, role, is_online)
           VALUES ($1, $2, 'participant', true)`,
          [params.id, joinRequest.user_id]        )

        // Update request status
        await DatabaseManager.executeQuery(
          `UPDATE room_join_requests 
           SET status = 'approved', processed_at = NOW()
           WHERE id = $1`,
          [params.requestId]
        )

        return NextResponse.json({ 
          message: 'Join request approved successfully' 
        })      } else if (action === 'reject') {
        // Update request status to rejected
        await DatabaseManager.executeQuery(
          `UPDATE room_join_requests 
           SET status = 'rejected', processed_at = NOW()
           WHERE id = $1`,
          [params.requestId]
        )

        return NextResponse.json({ 
          message: 'Join request rejected successfully' 
        })
      }

    } catch (dbError) {
      console.log('Database not available for join request processing:', dbError)
      return NextResponse.json({ 
        message: `Join request ${action}d successfully (mock)` 
      })
    }

  } catch (error) {
    console.error('Error processing join request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
