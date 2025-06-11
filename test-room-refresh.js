/**
 * Test script to verify room creation and refresh functionality
 * Run this after starting the development server
 */

const axios = require('axios')

const BASE_URL = 'http://localhost:3000'

class RoomRefreshTest {
  constructor() {
    this.token = null
  }

  async authenticate() {
    console.log('🔐 Authenticating user...')
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'test@example.com',
        password: 'testpassword'
      })
      
      this.token = response.data.token
      console.log('✅ Authentication successful')
      return true
    } catch (error) {
      console.log('❌ Authentication failed:', error.response?.data || error.message)
      return false
    }
  }

  async getRoomsBefore() {
    console.log('\n📋 Getting initial room list...')
    try {
      const response = await axios.get(`${BASE_URL}/api/rooms`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      })
      
      const rooms = response.data
      console.log(`✅ Found ${rooms.length} existing rooms:`)
      rooms.forEach((room, index) => {
        console.log(`   ${index + 1}. ${room.name} (${room.genre}) - Created by ${room.creator}`)
      })
      
      return rooms
    } catch (error) {
      console.log('❌ Failed to get rooms:', error.response?.data || error.message)
      return []
    }
  }

  async createNewRoom() {
    console.log('\n🏠 Creating new room...')
    try {
      const roomData = {
        name: `Test Room ${Date.now()}`,
        description: 'Testing room refresh functionality',
        genre: 'Electronic',
        isPublic: true,
        maxParticipants: 8
      }

      const response = await axios.post(`${BASE_URL}/api/rooms`, roomData, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const newRoom = response.data
      console.log(`✅ Created room: ${newRoom.name} (ID: ${newRoom.id})`)
      return newRoom
    } catch (error) {
      console.log('❌ Failed to create room:', error.response?.data || error.message)
      return null
    }
  }

  async getRoomsAfter() {
    console.log('\n📋 Getting updated room list...')
    try {
      const response = await axios.get(`${BASE_URL}/api/rooms`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      })
      
      const rooms = response.data
      console.log(`✅ Found ${rooms.length} rooms after creation:`)
      rooms.forEach((room, index) => {
        console.log(`   ${index + 1}. ${room.name} (${room.genre}) - Created by ${room.creator}`)
      })
      
      return rooms
    } catch (error) {
      console.log('❌ Failed to get rooms:', error.response?.data || error.message)
      return []
    }
  }

  async testRoomRefresh() {
    console.log('🧪 Testing Room Creation and Refresh Functionality\n')
    
    // Step 1: Authenticate
    const authSuccess = await this.authenticate()
    if (!authSuccess) {
      console.log('\n❌ Test failed: Could not authenticate')
      return false
    }

    // Step 2: Get initial room count
    const roomsBefore = await this.getRoomsBefore()
    const initialCount = roomsBefore.length

    // Step 3: Create new room
    const newRoom = await this.createNewRoom()
    if (!newRoom) {
      console.log('\n❌ Test failed: Could not create room')
      return false
    }

    // Step 4: Wait a moment for any async operations
    console.log('\n⏳ Waiting for system to update...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Step 5: Get updated room list
    const roomsAfter = await this.getRoomsAfter()
    const finalCount = roomsAfter.length

    // Step 6: Verify the room appears in the list
    const newRoomInList = roomsAfter.find(room => room.id === newRoom.id)
    
    console.log('\n📊 Test Results:')
    console.log(`   Initial room count: ${initialCount}`)
    console.log(`   Final room count: ${finalCount}`)
    console.log(`   New room appears in list: ${newRoomInList ? '✅ Yes' : '❌ No'}`)
    console.log(`   Room refresh working: ${finalCount > initialCount && newRoomInList ? '✅ Yes' : '❌ No'}`)

    if (finalCount > initialCount && newRoomInList) {
      console.log('\n🎉 SUCCESS: Room creation and refresh functionality is working!')
      console.log('   - New rooms are immediately available in the API')
      console.log('   - Room recommendations will refresh when triggered')
      return true
    } else {
      console.log('\n❌ FAILED: Room creation or refresh functionality has issues')
      return false
    }
  }
}

// Run the test
const test = new RoomRefreshTest()
test.testRoomRefresh().catch(error => {
  console.error('Test failed with error:', error)
})
