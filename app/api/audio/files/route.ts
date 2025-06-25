import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
    }    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Query for user's audio files using Prisma
    const files = await prisma.audioFile.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(files)
  } catch (error) {
    console.error('Error fetching audio files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
