import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import fs from 'fs/promises'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
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

    const url = new URL(request.url)
    const compositionId = url.searchParams.get('id')

    if (!compositionId) {
      return NextResponse.json({ error: 'Composition ID is required' }, { status: 400 })
    }

    // Get composition from database to verify ownership and get file path using Prisma
    const composition = await prisma.composition.findFirst({
      where: {
        id: compositionId,
        userId: user.id
      }
    })

    if (!composition) {
      return NextResponse.json({ error: 'Composition not found or access denied' }, { status: 404 })
    }

    // Delete composition using Prisma (cascade deletes will handle analysis)
    await prisma.composition.delete({
      where: {
        id: compositionId
      }
    })

    // Delete the physical file
    try {
      await fs.unlink(composition.filePath)
    } catch (fileError) {
      console.warn('Could not delete composition file:', fileError)
      // Continue anyway - database record is already deleted
    }

    return NextResponse.json({ message: 'Composition deleted successfully' })
  } catch (error) {
    console.error('Error deleting composition:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
