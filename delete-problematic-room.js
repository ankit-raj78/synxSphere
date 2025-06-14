const { Client } = require('pg');

async function deleteProblematicRoom() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'syncsphere',
    password: 'root',
    port: 5432,
  });

  try {
    await client.connect();
    console.log('🔍 Connected to PostgreSQL, searching for room "123"...');

    // First, let's find all rooms to see what's there
    const allRoomsQuery = 'SELECT id, name, creator_id, created_at FROM rooms ORDER BY created_at DESC';
    const allRoomsResult = await client.query(allRoomsQuery);
    
    console.log('\n📋 All rooms in database:');
    allRoomsResult.rows.forEach((room, index) => {
      console.log(`${index + 1}. ID: ${room.id}, Name: "${room.name}", Creator: ${room.creator_id}, Created: ${room.created_at}`);
    });

    // Find the specific room "123"
    const roomQuery = 'SELECT * FROM rooms WHERE name = $1';
    const roomResult = await client.query(roomQuery, ['123']);
    
    if (roomResult.rows.length > 0) {
      const room = roomResult.rows[0];
      console.log('\n🎯 Found problematic room "123":');
      console.log('  ID:', room.id);
      console.log('  Name:', room.name);
      console.log('  Creator ID:', room.creator_id);
      console.log('  Created:', room.created_at);
      
      const roomId = room.id;
      
      // Check and delete related data
      console.log('\n🧹 Cleaning up related data...');
      
      // Delete participants
      const deleteParticipantsQuery = 'DELETE FROM room_participants WHERE room_id = $1 RETURNING *';
      const deletedParticipants = await client.query(deleteParticipantsQuery, [roomId]);
      console.log(`  ✅ Deleted ${deletedParticipants.rows.length} participants`);
      
      // Delete join requests
      const deleteJoinRequestsQuery = 'DELETE FROM room_join_requests WHERE room_id = $1 RETURNING *';
      const deletedJoinRequests = await client.query(deleteJoinRequestsQuery, [roomId]);
      console.log(`  ✅ Deleted ${deletedJoinRequests.rows.length} join requests`);
      
      // Delete audio files associated with the room (if any)
      const deleteAudioQuery = 'DELETE FROM audio_files WHERE room_id = $1 RETURNING *';
      const deletedAudio = await client.query(deleteAudioQuery, [roomId]);
      console.log(`  ✅ Deleted ${deletedAudio.rows.length} audio files`);
      
      // Delete compositions associated with the room (if any)
      const deleteCompositionsQuery = 'DELETE FROM compositions WHERE room_id = $1 RETURNING *';
      const deletedCompositions = await client.query(deleteCompositionsQuery, [roomId]);
      console.log(`  ✅ Deleted ${deletedCompositions.rows.length} compositions`);
      
      // Finally, delete the room itself
      const deleteRoomQuery = 'DELETE FROM rooms WHERE id = $1 RETURNING *';
      const deletedRoom = await client.query(deleteRoomQuery, [roomId]);
      
      if (deletedRoom.rows.length > 0) {
        console.log('\n🎉 Successfully deleted room "123"!');
        console.log('  Deleted room:', deletedRoom.rows[0]);
      } else {
        console.log('\n❌ Failed to delete room');
      }
      
    } else {
      console.log('\n❓ Room "123" not found in database');
      
      // Let's also check for rooms with creator_id = 11
      const creatorRoomsQuery = 'SELECT * FROM rooms WHERE creator_id = $1';
      const creatorRoomsResult = await client.query(creatorRoomsQuery, ['11']);
      
      console.log(`\n🔍 Rooms created by user ID 11:`);
      if (creatorRoomsResult.rows.length > 0) {
        creatorRoomsResult.rows.forEach((room, index) => {
          console.log(`${index + 1}. ID: ${room.id}, Name: "${room.name}", Created: ${room.created_at}`);
        });
      } else {
        console.log('  No rooms found for creator ID 11');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('\n🔐 Database connection closed');
  }
}

deleteProblematicRoom();
