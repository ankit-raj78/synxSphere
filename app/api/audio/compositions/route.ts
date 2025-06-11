import { NextRequest, NextResponse } from 'next/server'
import DatabaseManager from '@/lib/database'
import { verifyToken } from '@/lib/auth'

// Mark route as dynamic since it requires request headers
export const dynamic = 'force-dynamic'

// Mark route as server-side only
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
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

    // Query for user's compositions
    const compositionsQuery = 'SELECT * FROM compositions WHERE user_id = $1 ORDER BY created_at DESC'
    const result = await DatabaseManager.executeQuery(compositionsQuery, [user.id])
    
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching compositions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
