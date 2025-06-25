import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import fs from 'fs'
import { join } from 'path'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

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

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const compositionId = params.id

    // Get composition from database using Prisma
    const composition = await prisma.composition.findFirst({
      where: {
        id: compositionId,
        userId: user.id
      }
    })

    if (!composition) {
      return NextResponse.json({ error: 'Composition not found' }, { status: 404 })
    }

    const filePath = composition.filePath

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Composition file not found' }, { status: 404 })
    }

    // Read the file
    const fileBuffer = fs.readFileSync(filePath)
    
    // Return the audio file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg', // Default since no mimeType in schema
        'Content-Length': composition.fileSize.toString(),
        'Cache-Control': 'public, max-age=3600',
        'Content-Disposition': `inline; filename="composition_${compositionId}.mp3"`
      }
    })
  } catch (error) {
    console.error('Error streaming composition:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
