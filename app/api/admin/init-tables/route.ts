import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import DatabaseManager from '@/lib/database'

export async function POST(request: NextRequest) {
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
      // Create room join requests table
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS room_join_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            room_id UUID NOT NULL,
            user_id UUID NOT NULL,
            message TEXT DEFAULT '',
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            processed_at TIMESTAMP WITH TIME ZONE,
            UNIQUE(room_id, user_id, status)
        );
        
        CREATE INDEX IF NOT EXISTS idx_room_join_requests_room_id ON room_join_requests(room_id);
        CREATE INDEX IF NOT EXISTS idx_room_join_requests_user_id ON room_join_requests(user_id);
        CREATE INDEX IF NOT EXISTS idx_room_join_requests_status ON room_join_requests(status);
      `

      await DatabaseManager.executeQuery(createTableSQL)

      // Verify table creation success
      const verifyResult = await DatabaseManager.executeQuery(
        "SELECT table_name FROM information_schema.tables WHERE table_name = 'room_join_requests'"
      )

      if (verifyResult.rows.length > 0) {
        return NextResponse.json({ 
          message: 'room_join_requests table created successfully',
          status: 'success' 
        })
      } else {
        return NextResponse.json({ 
          message: 'Table creation may have failed',
          status: 'warning' 
        })
      }

    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ 
        message: 'Database not available, table creation skipped',
        status: 'mock' 
      })
    }

  } catch (error) {
    console.error('Error creating table:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
