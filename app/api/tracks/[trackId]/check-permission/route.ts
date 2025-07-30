import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

// 辅助函数：获取 CORS headers
function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || 'https://localhost:8080'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-project-id, x-room-id',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// 处理 OPTIONS 请求（CORS preflight）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...getCorsHeaders(request),
      'Access-Control-Max-Age': '86400',
    },
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  try {
    // 获取并验证 token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { 
          status: 401,
          headers: getCorsHeaders(request)
        }
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { 
          status: 401,
          headers: getCorsHeaders(request)
        }
      )
    }

    const userId = decoded.id
    const trackId = params.trackId
    const projectId = request.headers.get('x-project-id')
    const roomId = request.headers.get('x-room-id')

    console.log('[API] Checking permission for track:', trackId)
    console.log('[API] User ID:', userId)
    console.log('[API] Project ID:', projectId)
    console.log('[API] Room ID:', roomId)

    // 查询轨道所有权
    const ownership = await db.query(
      `SELECT owner_id FROM box_ownership 
       WHERE box_uuid = $1 
       AND project_id = $2
       LIMIT 1`,
      [trackId, projectId]
    )

    if (ownership.rows.length === 0) {
      // 轨道未被认领
      return NextResponse.json(
        { 
          hasPermission: true,
          reason: 'unclaimed',
          currentUserId: userId
        },
        {
          status: 200,
          headers: getCorsHeaders(request)
        }
      )
    }

    const ownerId = ownership.rows[0].owner_id
    const hasPermission = ownerId === userId

    return NextResponse.json(
      { 
        hasPermission,
        reason: hasPermission ? 'owner' : 'not_owner',
        ownerId,
        currentUserId: userId
      },
      {
        status: 200,
        headers: getCorsHeaders(request)
      }
    )

  } catch (error) {
    console.error('[API] Error checking track permission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: getCorsHeaders(request)
      }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  try {
    // 获取并验证 token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { 
          status: 401,
          headers: getCorsHeaders(request)
        }
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { 
          status: 401,
          headers: getCorsHeaders(request)
        }
      )
    }

    const userId = decoded.id
    const trackId = params.trackId
    const projectId = request.headers.get('x-project-id')
    const roomId = request.headers.get('x-room-id')

    console.log('[API] Creating ownership for track:', trackId)
    console.log('[API] User ID:', userId)
    console.log('[API] Project ID:', projectId)
    console.log('[API] Room ID:', roomId)

    // 检查是否已有所有者
    const existing = await db.query(
      `SELECT owner_id FROM box_ownership 
       WHERE box_uuid = $1 
       AND project_id = $2
       LIMIT 1`,
      [trackId, projectId]
    )

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Track already has an owner' },
        { 
          status: 409,
          headers: getCorsHeaders(request)
        }
      )
    }

    // 创建所有权记录
    await db.query(
      `INSERT INTO box_ownership (box_uuid, project_id, owner_id, room_id, owned_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [trackId, projectId, userId, roomId]
    )

    return NextResponse.json(
      { 
        success: true,
        trackId,
        ownerId: userId
      },
      {
        status: 201,
        headers: getCorsHeaders(request)
      }
    )

  } catch (error) {
    console.error('[API] Error creating track ownership:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: getCorsHeaders(request)
      }
    )
  }
} 