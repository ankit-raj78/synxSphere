import { NextRequest, NextResponse } from 'next/server';

// This route requires authentication and should not be statically generated
export const dynamic = 'force-dynamic'
import jwt from 'jsonwebtoken';

import { prisma } from '@/lib/prisma';


export async function DELETE(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.id;
    console.log('Starting account deletion process for user:', userId);

    try {
      // Use Prisma transaction to ensure all deletions happen atomically
      const result = await prisma.$transaction(async (tx: any) => {
        // 1. Delete user's audio files records and get filenames for cleanup
        const audioFiles = await tx.audioFile.findMany({
          where: { userId: userId },
          select: { filename: true }
        });
        
        const audioFilesCount = await tx.audioFile.deleteMany({
          where: { userId: userId }
        });
        console.log(`Deleted ${audioFilesCount.count} audio files for user ${userId}`);

        // 2. Delete user's room memberships and join requests
        await tx.joinRequest.deleteMany({ where: { userId: userId } });
        await tx.roomParticipant.deleteMany({ where: { userId: userId } });
        console.log('Deleted room memberships and join requests');

        // 3. Delete rooms created by the user and get room info
        const rooms = await tx.room.findMany({
          where: { creatorId: userId },
          select: { id: true, name: true }
        });
        
        const roomsCount = await tx.room.deleteMany({
          where: { creatorId: userId }
        });
        console.log(`Deleted ${roomsCount.count} rooms created by user ${userId}`);

        // 4. Delete user's compositions
        await tx.composition.deleteMany({ where: { userId: userId } });
        console.log('Deleted user compositions');

        // 5. Finally, delete the user account
        const deletedUser = await tx.user.delete({
          where: { id: userId },
          select: { username: true, email: true }
        });

        return {
          deletedUser,
          audioFilesDeleted: audioFilesCount.count,
          roomsDeleted: roomsCount.count,
          audioFilenames: audioFiles.map((f: { filename: string }) => f.filename)
        };
      });

      console.log(`Successfully deleted user account: ${result.deletedUser.username} (${result.deletedUser.email})`);

      return NextResponse.json({ 
        message: 'Account successfully deleted',
        details: {
          username: result.deletedUser.username,
          audioFilesDeleted: result.audioFilesDeleted,
          roomsDeleted: result.roomsDeleted
        }
      });

    } catch (transactionError: any) {
      // Prisma automatically rolls back transaction on error
      if (transactionError.code === 'P2025') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      throw transactionError;
    }

  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
