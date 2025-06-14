const fetch = require('node-fetch');

async function deleteRoomViaAPI() {
  try {
    // First, let's get a token by logging in as a test user
    console.log('🔐 Getting authentication token...');
    
    const loginResponse = await fetch('http://localhost:3005/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed, trying to register first...');
      
      // Try to register the user first
      await fetch('http://localhost:3005/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          username: 'testuser'
        })
      });
      
      // Try login again
      const retryLogin = await fetch('http://localhost:3005/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });
      
      if (!retryLogin.ok) {
        throw new Error('Could not authenticate');
      }
      
      const loginData = await retryLogin.json();
      var token = loginData.token;
    } else {
      const loginData = await loginResponse.json();
      var token = loginData.token;
    }
    
    console.log('✅ Got authentication token');
    
    // Get all rooms
    console.log('\n🔍 Fetching all rooms...');
    const roomsResponse = await fetch('http://localhost:3005/api/rooms', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (roomsResponse.ok) {
      const rooms = await roomsResponse.json();
      console.log(`📋 Found ${rooms.length} rooms:`);
      
      rooms.forEach((room, index) => {
        console.log(`${index + 1}. ID: ${room.id}, Name: "${room.name}", Creator: ${room.creator}`);
      });
      
      // Look for room "123"
      const room123 = rooms.find(room => room.name === '123');
      
      if (room123) {
        console.log(`\n🎯 Found room "123" with ID: ${room123.id}`);
        console.log(`   Creator: ${room123.creator}`);
        console.log(`   Participants: ${room123.participantCount || 0}`);
        
        // Try to delete it
        console.log('\n🗑️ Attempting to delete room...');
        const deleteResponse = await fetch(`http://localhost:3005/api/rooms/${room123.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (deleteResponse.ok) {
          console.log('🎉 Successfully deleted room "123"!');
        } else {
          const error = await deleteResponse.text();
          console.log(`❌ Failed to delete room: ${error}`);
        }
      } else {
        console.log('\n❓ Room "123" not found in API results');
      }
    } else {
      console.log('❌ Failed to fetch rooms');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deleteRoomViaAPI();
