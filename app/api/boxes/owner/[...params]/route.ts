import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// This route requires authentication and should not be statically generated
export const dynamic = 'force-dynamic'

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { params: string[] } }
) {
  console.log('=== BOX OWNERSHIP REQUEST START ===')
  console.log('Box ownership request params:', params.params)
  console.log('Request URL:', request.url)
  
  try {
    // Parse the URL parameters: room-{roomId}/{boxId}
    if (!params.params || params.params.length !== 2) {
      console.error('Invalid parameters format. Expected: room-{roomId}/{boxId}')
      return NextResponse.json({ error: 'Invalid parameters format' }, { status: 400 })
    }
    
    const [roomParam, boxId] = params.params
    
    // Extract room ID from room-{roomId} format
    if (!roomParam.startsWith('room-')) {
      console.error('Invalid room parameter format. Expected: room-{roomId}')
      return NextResponse.json({ error: 'Invalid room parameter format' }, { status: 400 })
    }
    
    const roomId = roomParam.substring(5) // Remove 'room-' prefix
    
    console.log('Parsed roomId:', roomId)
    console.log('Parsed boxId:', boxId)
    
    // Validate ID parameters
    if (!roomId || !boxId) {
      console.error('Missing room ID or box ID')
      return NextResponse.json({ error: 'Missing room ID or box ID' }, { status: 400 })
    }
    
    // Get authentication token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || 
                  new URL(request.url).searchParams.get('auth')
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    console.log('User authenticated:', user.id)
    
    // Check if user has access to the room
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        participants: {
          some: {
            userId: user.id
          }
        }
      }
    })
    
    if (!room) {
      console.log('User does not have access to room:', roomId)
      return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 })
    }
    
    // Try to find box ownership record
    const boxOwnership = await prisma.$queryRaw<Array<{
      project_id: string,
      box_uuid: string,
      owner_id: string,
      owned_at: Date
    }>>`
      SELECT bo.project_id, bo.box_uuid, bo.owner_id, bo.owned_at
      FROM box_ownership bo
      WHERE bo.box_uuid = ${boxId} AND bo.project_id = ${roomId}
    `
    
    if (!boxOwnership || boxOwnership.length === 0) {
      console.log('Box ownership not found for boxId:', boxId, 'in project:', roomId)
      return NextResponse.json({ 
        error: 'Box ownership not found',
        boxId: boxId,
        projectId: roomId
      }, { status: 404 })
    }
    
    const ownership = boxOwnership[0]
    console.log('Box ownership found:', ownership)
    
    return NextResponse.json({
      boxId: ownership.box_uuid,
      projectId: ownership.project_id,
      ownerId: ownership.owner_id,
      ownedAt: ownership.owned_at
    })
    
  } catch (error: any) {
    console.error('=== BOX OWNERSHIP ERROR ===')
    console.error('Error fetching box ownership:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message || 'Unknown internal error occurred'
    }, { status: 500 })
  } finally {
    console.log('=== BOX OWNERSHIP REQUEST END ===')
  }
}
