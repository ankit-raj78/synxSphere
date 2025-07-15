import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import fs from 'fs/promises'

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
    const fileId = url.searchParams.get('id')

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    // Get file information from database using Prisma
    const file = await prisma.audioFile.findFirst({
      where: {
        id: fileId,
        userId: user.id
      }
    });
    
    if (!file) {
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 });
    }

    try {
      // Delete physical file if it exists
      if (file.filePath) {
        await fs.unlink(file.filePath);
      }
    } catch (fsError) {
      console.warn('Could not delete physical file:', fsError);
      // Continue with database deletion even if physical file deletion fails
    }

    // Use Prisma transaction to ensure atomicity
    const deletedFile = await prisma.$transaction(async (tx: any) => {
      // Delete from audio_analysis table first (foreign key constraint)
      await tx.audioAnalysis.deleteMany({
        where: { fileId: fileId }
      });

      // Delete from audio_files table
      const deletedFile = await tx.audioFile.delete({
        where: {
          id: fileId,
          userId: user.id
        }
      });

      return deletedFile;
    });

    return NextResponse.json({
      message: 'File deleted successfully',
      deletedFile: deletedFile
    }, { status: 200 })

  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
