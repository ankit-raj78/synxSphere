import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'

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

    const { db } = await connectToDatabase()
    
    const files = await db.collection('audioFiles')
      .find({ userId: user.userId })
      .sort({ uploadedAt: -1 })
      .toArray()

    return NextResponse.json(files)
  } catch (error) {
    console.error('Error fetching audio files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
