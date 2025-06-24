// ✅ SECURE API endpoint using Prisma ORM - No SQL injection risk
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { DatabaseService } from '@/lib/prisma'

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

    // ✅ SECURE - Using Prisma ORM with type safety and automatic parameterization
    const roomsData = await DatabaseService.getUserRooms(userId)

    return NextResponse.json(roomsData)

  } catch (error) {
    console.error('Error fetching user room data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
