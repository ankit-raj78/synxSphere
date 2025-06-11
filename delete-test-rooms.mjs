// 删除test房间的脚本
import DatabaseManager from './lib/database.js';

async function deleteTestRooms() {
  try {
    console.log('开始删除test房间...');
    
    // 查找所有test房间
    const testRooms = await DatabaseManager.executeQuery(
      "SELECT * FROM rooms WHERE name ILIKE '%test%'"
    );
    
    if (testRooms.rows.length === 0) {
      console.log('没有找到test房间');
      return;
    }
    
    console.log(`找到 ${testRooms.rows.length} 个test房间:`);
    testRooms.rows.forEach(room => {
      console.log(`- ${room.name} (ID: ${room.id})`);
    });
    
    // 删除test房间的参与者
    for (const room of testRooms.rows) {
      await DatabaseManager.executeQuery(
        'DELETE FROM room_participants WHERE room_id = $1',
        [room.id]
      );
      console.log(`删除房间 ${room.name} 的参与者`);
      
      // 删除房间
      await DatabaseManager.executeQuery(
        'DELETE FROM rooms WHERE id = $1',
        [room.id]
      );
      console.log(`删除房间 ${room.name}`);
    }
    
    console.log('所有test房间已删除');
    
  } catch (error) {
    console.error('删除test房间时出错:', error);
  }
  
  process.exit(0);
}

deleteTestRooms();
