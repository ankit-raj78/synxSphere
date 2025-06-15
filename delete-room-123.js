const DatabaseManager = require('./lib/database.ts');

async function deleteRoom123() {
  try {
    console.log('🔍 Searching for room "123"...');
    
    // Find all rooms first
    const allRoomsQuery = `SELECT id, name, creator_id, created_at FROM rooms ORDER BY created_at DESC`;
    const allRooms = await DatabaseManager.executeQuery(allRoomsQuery);
    
    console.log('\n📋 All rooms in database:');
    allRooms.rows.forEach((room, index) => {
      console.log(`${index + 1}. ID: ${room.id}, Name: "${room.name}", Creator: ${room.creator_id}`);
    });
    
    // Find room "123"
    const findRoomQuery = `SELECT * FROM rooms WHERE name = $1`;
    const roomResult = await DatabaseManager.executeQuery(findRoomQuery, ['123']);
    
    if (roomResult.rows.length > 0) {
      const room = roomResult.rows[0];
      console.log(`\n🎯 Found room "123" with ID: ${room.id}`);
      
      // Delete all related data in correct order
      console.log('\n🧹 Deleting related data...');
      
      // 1. Delete join requests
      await DatabaseManager.executeQuery('DELETE FROM room_join_requests WHERE room_id = $1', [room.id]);
      console.log('  ✅ Deleted join requests');
      
      // 2. Delete participants
      await DatabaseManager.executeQuery('DELETE FROM room_participants WHERE room_id = $1', [room.id]);
      console.log('  ✅ Deleted participants');
      
      // 3. Delete compositions
      await DatabaseManager.executeQuery('DELETE FROM compositions WHERE room_id = $1', [room.id]);
      console.log('  ✅ Deleted compositions');
      
      // 4. Delete audio files
      await DatabaseManager.executeQuery('DELETE FROM audio_files WHERE room_id = $1', [room.id]);
      console.log('  ✅ Deleted audio files');
      
      // 5. Finally delete the room
      const deleteResult = await DatabaseManager.executeQuery('DELETE FROM rooms WHERE id = $1 RETURNING *', [room.id]);
      
      if (deleteResult.rows.length > 0) {
        console.log('\n🎉 Successfully deleted room "123"!');
      }
    } else {
      console.log('\n❓ Room "123" not found');
      
      // Check for creator_id = 11
      const creatorRoomsQuery = `SELECT * FROM rooms WHERE creator_id = $1`;
      const creatorRooms = await DatabaseManager.executeQuery(creatorRoomsQuery, ['11']);
      
      console.log(`\n🔍 Rooms by creator ID 11: ${creatorRooms.rows.length} found`);
      creatorRooms.rows.forEach(room => {
        console.log(`  - ID: ${room.id}, Name: "${room.name}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deleteRoom123();
