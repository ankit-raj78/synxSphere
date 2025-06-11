// API endpoint to get user's room information and membership status
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import DatabaseManager from '@/lib/database'

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

    const userId = tokenData.id

    // Get user's room statistics
    const statsQuery = `
      SELECT 
        -- Rooms the user created
        COUNT(DISTINCT CASE WHEN r.creator_id = $1 THEN r.id END) as created_rooms,
        -- Rooms the user is a participant in (excluding created rooms)
        COUNT(DISTINCT CASE WHEN rp.user_id = $1 AND r.creator_id != $1 THEN r.id END) as joined_rooms,
        -- Total rooms user is involved in
        COUNT(DISTINCT CASE WHEN (r.creator_id = $1 OR rp.user_id = $1) THEN r.id END) as total_rooms
      FROM rooms r
      LEFT JOIN room_participants rp ON r.id = rp.room_id
      WHERE r.creator_id = $1 OR rp.user_id = $1
    `

    const statsResult = await DatabaseManager.executeQuery(statsQuery, [userId])
    const stats = statsResult.rows[0]

    // Get rooms the user created
    const createdRoomsQuery = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.genre,
        r.is_live,
        r.created_at,
        COUNT(DISTINCT rp.user_id) as participant_count
      FROM rooms r
      LEFT JOIN room_participants rp ON r.id = rp.room_id
      WHERE r.creator_id = $1
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `

    const createdRoomsResult = await DatabaseManager.executeQuery(createdRoomsQuery, [userId])

    // Get rooms the user joined (excluding created rooms)
    const joinedRoomsQuery = `
      SELECT DISTINCT
        r.id,
        r.name,
        r.description,
        r.genre,
        r.is_live,
        r.created_at,
        u.username as creator_name,
        COUNT(DISTINCT rp2.user_id) as participant_count
      FROM rooms r
      INNER JOIN room_participants rp ON r.id = rp.room_id
      LEFT JOIN users u ON r.creator_id = u.id
      LEFT JOIN room_participants rp2 ON r.id = rp2.room_id
      WHERE rp.user_id = $1 AND r.creator_id != $1
      GROUP BY r.id, u.username
      ORDER BY r.created_at DESC
    `

    const joinedRoomsResult = await DatabaseManager.executeQuery(joinedRoomsQuery, [userId])

    // Get room membership status for all rooms
    const membershipQuery = `
      SELECT DISTINCT
        r.id as room_id,
        CASE 
          WHEN r.creator_id = $1 THEN 'creator'
          WHEN rp.user_id = $1 THEN 'member'
          ELSE 'none'
        END as membership_status
      FROM rooms r
      LEFT JOIN room_participants rp ON r.id = rp.room_id AND rp.user_id = $1
      WHERE r.name NOT ILIKE '%test%'
    `

    const membershipResult = await DatabaseManager.executeQuery(membershipQuery, [userId])
    
    // Convert to map for easy lookup
    const membershipMap: Record<string, string> = {}
    membershipResult.rows.forEach((row: any) => {
      membershipMap[row.room_id] = row.membership_status
    })

    return NextResponse.json({
      statistics: {
        created_rooms: parseInt(stats.created_rooms || '0'),
        joined_rooms: parseInt(stats.joined_rooms || '0'),
        total_rooms: parseInt(stats.total_rooms || '0')
      },
      created_rooms: createdRoomsResult.rows,
      joined_rooms: joinedRoomsResult.rows,
      membership_map: membershipMap
    })

  } catch (error) {
    console.error('Error fetching user room data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
