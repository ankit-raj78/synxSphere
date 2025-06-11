#!/usr/bin/env node

/**
 * Test room creation and access functionality
 */

const axios = require('axios');

const CONFIG = {
  baseUrl: 'http://localhost:3002',
  testUser: {
    username: 'roomtest',
    email: 'roomtest@example.com',
    password: 'testpassword123'
  }
};

class RoomTest {
  constructor() {
    this.token = null;
    this.userId = null;
    this.roomId = null;
  }

  async registerAndLogin() {
    console.log('🔑 Registering and logging in test user...');
    
    try {
      // Try to register
      await axios.post(`${CONFIG.baseUrl}/api/auth/register`, CONFIG.testUser);
    } catch (error) {
      // User might already exist
    }

    // Login
    const response = await axios.post(`${CONFIG.baseUrl}/api/auth/login`, {
      email: CONFIG.testUser.email,
      password: CONFIG.testUser.password
    });

    this.token = response.data.token;
    this.userId = response.data.user.id;
    console.log('✅ Login successful');
    console.log(`   User ID: ${this.userId}`);
  }

  async testRoomCreation() {
    console.log('\n🏠 Testing room creation...');
    
    try {
      const response = await axios.post(`${CONFIG.baseUrl}/api/rooms`, {
        name: 'Test Room',
        description: 'A test room for PostgreSQL migration',
        genre: 'Test'
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      this.roomId = response.data.id;
      console.log('✅ Room creation successful');
      console.log(`   Room ID: ${this.roomId}`);
      console.log(`   Room Name: ${response.data.name}`);
      console.log(`   Creator: ${response.data.creator_id}`);
      
      return true;
    } catch (error) {
      console.log('❌ Room creation failed:', error.response?.data?.error || error.message);
      return false;
    }
  }

  async testRoomAccess() {
    if (!this.roomId) {
      console.log('\n⚠️  Skipping room access test - no room created');
      return false;
    }

    console.log('\n🚪 Testing room access...');
    
    try {
      const response = await axios.get(`${CONFIG.baseUrl}/api/rooms/${this.roomId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      const room = response.data;
      console.log('✅ Room access successful');
      console.log(`   Room Name: ${room.name}`);
      console.log(`   Description: ${room.description}`);
      console.log(`   Participants: ${room.participants.length}`);
      console.log(`   Tracks: ${room.tracks.length}`);
      console.log(`   Creator: ${room.creator.username}`);
      
      return true;
    } catch (error) {
      console.log('❌ Room access failed:', error.response?.data?.error || error.message);
      console.log('   Error details:', error.response?.data);
      return false;
    }
  }

  async run() {
    console.log('🏠 SyncSphere Room Functionality Test');
    console.log('=' .repeat(50));
    
    try {
      await this.registerAndLogin();
      const createSuccess = await this.testRoomCreation();
      const accessSuccess = await this.testRoomAccess();
      
      console.log('\n🎉 ROOM TEST RESULTS');
      console.log('=' .repeat(50));
      console.log(`🔑 Authentication: ✅ PASS`);
      console.log(`🏠 Room Creation: ${createSuccess ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`🚪 Room Access: ${accessSuccess ? '✅ PASS' : '❌ FAIL'}`);
      
      if (createSuccess && accessSuccess) {
        console.log('\n🚀 ALL ROOM TESTS PASSED!');
        console.log('✅ Room functionality is working correctly with PostgreSQL');
      } else {
        console.log('\n⚠️  Some room tests failed. Check the errors above.');
      }
      
    } catch (error) {
      console.log('\n❌ ROOM TEST FAILED:', error.message);
    }
  }
}

// Run the test if called directly
if (require.main === module) {
  const test = new RoomTest();
  test.run().catch(console.error);
}

module.exports = RoomTest;
