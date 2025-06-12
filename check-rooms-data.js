const DatabaseManager = require('./lib/database.ts').default;

async function checkData() {
  try {
    // Check all rooms
    const rooms = await DatabaseManager.executeQuery('SELECT * FROM rooms ORDER BY created_at DESC');
    console.log('=== All Rooms ===');
    rooms.rows.forEach(room => {
      console.log(`ID: ${room.id}, Name: ${room.name}, Creator: ${room.creator_id}`);
    });

    // Check room participants
    const participants = await DatabaseManager.executeQuery('SELECT * FROM room_participants');
    console.log('\n=== Room Participants ===');
    participants.rows.forEach(p => {
      console.log(`Room: ${p.room_id}, User: ${p.user_id}, Role: ${p.role}`);
    });

    // Check if there are test rooms
    const testRooms = await DatabaseManager.executeQuery("SELECT * FROM rooms WHERE name ILIKE '%test%'");
    console.log('\n=== Test Rooms ===');
    testRooms.rows.forEach(room => {
      console.log(`Test Room: ${room.id} - ${room.name}`);
    });

    // Get user information
    const users = await DatabaseManager.executeQuery('SELECT id, username, email FROM users');
    console.log('\n=== User Information ===');
    users.rows.forEach(user => {
      console.log(`User: ${user.id} - ${user.username || user.email}`);
    });

  } catch (error) {
    console.error('Query error:', error);
  }

  process.exit(0);
}

checkData();
