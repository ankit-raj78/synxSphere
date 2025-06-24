import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import DatabaseManager from '@/lib/database';

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

    const pool = await DatabaseManager.getPool();
    const client = await pool.connect();
    
    try {
      // Start a transaction to ensure all deletions happen atomically
      await client.query('BEGIN');

      // 1. Delete user's audio files records (the actual files would need to be deleted from file system separately)
      const audioFilesResult = await client.query(
        'DELETE FROM audio_files WHERE user_id = $1 RETURNING filename',
        [userId]
      );
      console.log(`Deleted ${audioFilesResult.rowCount} audio files for user ${userId}`);

      // 2. Delete user's room memberships and join requests
      await client.query('DELETE FROM room_join_requests WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM room_participants WHERE user_id = $1', [userId]);
      console.log('Deleted room memberships and join requests');

      // 3. Delete rooms created by the user (this will cascade to related data)
      const roomsResult = await client.query(
        'DELETE FROM rooms WHERE creator_id = $1 RETURNING id, name',
        [userId]
      );
      console.log(`Deleted ${roomsResult.rowCount} rooms created by user ${userId}`);

      // 4. Delete user's compositions
      await client.query('DELETE FROM compositions WHERE user_id = $1', [userId]);
      console.log('Deleted user compositions');

      // 5. Finally, delete the user account
      const userResult = await client.query(
        'DELETE FROM users WHERE id = $1 RETURNING username, email',
        [userId]
      );

      if (userResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Commit the transaction
      await client.query('COMMIT');
      
      const deletedUser = userResult.rows[0];
      console.log(`Successfully deleted user account: ${deletedUser.username} (${deletedUser.email})`);

      return NextResponse.json({ 
        message: 'Account successfully deleted',
        details: {
          username: deletedUser.username,
          audioFilesDeleted: audioFilesResult.rowCount,
          roomsDeleted: roomsResult.rowCount
        }
      });

    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
