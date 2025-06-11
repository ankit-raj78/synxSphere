import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import DatabaseManager from '@/lib/database'

// 申请加入房间
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
      // 检查房间是否存在
      const roomResult = await DatabaseManager.executeQuery(
        'SELECT * FROM rooms WHERE id = $1',
        [params.id]
      )

      if (roomResult.rows.length === 0) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 })
      }

      const room = roomResult.rows[0]

      // 检查用户是否已经是参与者
      const existingParticipant = await DatabaseManager.executeQuery(
        'SELECT * FROM room_participants WHERE room_id = $1 AND user_id = $2',
        [params.id, tokenData.id]
      )

      if (existingParticipant.rows.length > 0) {
        return NextResponse.json({ error: 'Already a participant in this room' }, { status: 409 })
      }

      // 检查是否已经有待处理的申请
      const existingRequest = await DatabaseManager.executeQuery(
        `SELECT * FROM room_join_requests 
         WHERE room_id = $1 AND user_id = $2 AND status = 'pending'`,
        [params.id, tokenData.id]
      )

      if (existingRequest.rows.length > 0) {
        return NextResponse.json({ error: 'Join request already pending' }, { status: 409 })
      }

      // 创建加入申请
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

// 获取房间的加入申请
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
      // 检查用户是否是房间创建者
      const roomResult = await DatabaseManager.executeQuery(
        'SELECT * FROM rooms WHERE id = $1 AND creator_id = $2',
        [params.id, tokenData.id]
      )

      if (roomResult.rows.length === 0) {
        return NextResponse.json({ error: 'Not authorized to view join requests' }, { status: 403 })
      }

      // 获取待处理的申请
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
