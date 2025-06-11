const DatabaseManager = require('./lib/database.ts').default;

async function checkData() {
  try {
    // 检查所有房间
    const rooms = await DatabaseManager.executeQuery('SELECT * FROM rooms ORDER BY created_at DESC');
    console.log('=== 所有房间 ===');
    rooms.rows.forEach(room => {
      console.log(`ID: ${room.id}, Name: ${room.name}, Creator: ${room.creator_id}`);
    });

    // 检查房间参与者
    const participants = await DatabaseManager.executeQuery('SELECT * FROM room_participants');
    console.log('\n=== 房间参与者 ===');
    participants.rows.forEach(p => {
      console.log(`Room: ${p.room_id}, User: ${p.user_id}, Role: ${p.role}`);
    });

    // 检查是否有test room
    const testRooms = await DatabaseManager.executeQuery("SELECT * FROM rooms WHERE name ILIKE '%test%'");
    console.log('\n=== Test房间 ===');
    testRooms.rows.forEach(room => {
      console.log(`Test Room: ${room.id} - ${room.name}`);
    });

    // 获取用户信息
    const users = await DatabaseManager.executeQuery('SELECT id, username, email FROM users');
    console.log('\n=== 用户信息 ===');
    users.rows.forEach(user => {
      console.log(`User: ${user.id} - ${user.username || user.email}`);
    });

  } catch (error) {
    console.error('查询出错:', error);
  }

  process.exit(0);
}

checkData();
