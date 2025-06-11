import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import DatabaseManager from '@/lib/database'

export async function DELETE(request: NextRequest) {
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
      console.log('Deleting test rooms...')
      
      // 查找所有test房间
      const testRooms = await DatabaseManager.executeQuery(
        "SELECT * FROM rooms WHERE name ILIKE '%test%'"
      )
      
      if (testRooms.rows.length === 0) {
        return NextResponse.json({ message: 'No test rooms found' })
      }
      
      let deletedCount = 0
      
      // 删除test房间的参与者和房间
      for (const room of testRooms.rows) {
        // 删除参与者
        await DatabaseManager.executeQuery(
          'DELETE FROM room_participants WHERE room_id = $1',
          [room.id]
        )
        
        // 删除房间
        await DatabaseManager.executeQuery(
          'DELETE FROM rooms WHERE id = $1',
          [room.id]
        )
        
        deletedCount++
        console.log(`Deleted test room: ${room.name}`)
      }
      
      return NextResponse.json({ 
        message: `Successfully deleted ${deletedCount} test rooms` 
      })
      
    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error deleting test rooms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
