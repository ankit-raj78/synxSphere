// Script to delete test rooms
import DatabaseManager from './lib/database.js';

async function deleteTestRooms() {
  try {
    console.log('Starting to delete test rooms...');
    
    // Find all test rooms
    const testRooms = await DatabaseManager.executeQuery(
      "SELECT * FROM rooms WHERE name ILIKE '%test%'"
    );
    
    if (testRooms.rows.length === 0) {
      console.log('No test rooms found');
      return;
    }
    
    console.log(`Found ${testRooms.rows.length} test rooms:`);
    testRooms.rows.forEach(room => {
      console.log(`- ${room.name} (ID: ${room.id})`);
    });
    
    // Delete test room participants
    for (const room of testRooms.rows) {
      await DatabaseManager.executeQuery(
        'DELETE FROM room_participants WHERE room_id = $1',
        [room.id]
      );
      console.log(`Deleted participants for room ${room.name}`);
      
      // Delete room
      await DatabaseManager.executeQuery(
        'DELETE FROM rooms WHERE id = $1',
        [room.id]
      );
      console.log(`Deleted room ${room.name}`);
    }
    
    console.log('All test rooms deleted');
    
  } catch (error) {
    console.error('Error deleting test rooms:', error);
  }
  
  process.exit(0);
}

deleteTestRooms();
