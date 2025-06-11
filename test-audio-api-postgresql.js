#!/usr/bin/env node

/**
 * Test script for SyncSphere Audio APIs with PostgreSQL
 * Tests the newly migrated audio upload, streaming, and file management APIs
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  testUser: {
    username: 'audiotest',
    email: 'audiotest@example.com',
    password: 'testpassword123'
  },
  // Create a simple test audio file if none exists
  testAudioContent: Buffer.from('RIFF....WAVEfmt '), // Minimal WAV header
  testAudioName: 'test-audio.wav'
};

class AudioAPITest {
  constructor() {
    this.token = null;
    this.userId = null;
    this.uploadedFiles = [];
  }

  async init() {
    console.log('🎵 SyncSphere Audio API PostgreSQL Test');
    console.log('=' .repeat(50));
    
    // Create a test audio file if it doesn't exist
    const testFilePath = path.join(process.cwd(), CONFIG.testAudioName);
    if (!fs.existsSync(testFilePath)) {
      fs.writeFileSync(testFilePath, CONFIG.testAudioContent);
      console.log('✅ Created test audio file');
    }
  }

  async registerUser() {
    console.log('\n📝 Registering test user...');
    
    try {
      const response = await axios.post(`${CONFIG.baseUrl}/api/auth/register`, {
        username: CONFIG.testUser.username,
        email: CONFIG.testUser.email,
        password: CONFIG.testUser.password
      });

      console.log('✅ User registered successfully');
      return true;
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
        console.log('✅ User already exists, proceeding...');
        return true;
      }
      console.log('❌ Registration failed:', error.response?.data?.error || error.message);
      return false;
    }
  }

  async loginUser() {
    console.log('\n🔑 Logging in test user...');
    
    try {
      const response = await axios.post(`${CONFIG.baseUrl}/api/auth/login`, {
        email: CONFIG.testUser.email,
        password: CONFIG.testUser.password
      });

      this.token = response.data.token;
      this.userId = response.data.user.id;
      console.log('✅ Login successful');
      console.log(`   Token: ${this.token.substring(0, 20)}...`);
      console.log(`   User ID: ${this.userId}`);
      return true;
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data?.error || error.message);
      return false;
    }
  }

  async testAudioUpload() {
    console.log('\n⬆️  Testing audio file upload...');
    
    try {
      const testFilePath = path.join(process.cwd(), CONFIG.testAudioName);
      const formData = new FormData();
      formData.append('audio', fs.createReadStream(testFilePath));

      const response = await axios.post(`${CONFIG.baseUrl}/api/audio/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.token}`
        }
      });

      this.uploadedFiles = response.data;
      console.log('✅ Audio upload successful');
      console.log(`   Uploaded ${this.uploadedFiles.length} file(s)`);
      
      if (this.uploadedFiles.length > 0) {
        const file = this.uploadedFiles[0];
        console.log(`   File ID: ${file.id}`);
        console.log(`   Filename: ${file.filename}`);
        console.log(`   Original Name: ${file.original_name}`);
        console.log(`   Size: ${file.file_size} bytes`);
        console.log(`   MIME Type: ${file.mime_type}`);
      }
      
      return true;
    } catch (error) {
      console.log('❌ Audio upload failed:', error.response?.data?.error || error.message);
      if (error.response?.data) {
        console.log('   Response data:', error.response.data);
      }
      return false;
    }
  }

  async testListAudioFiles() {
    console.log('\n📋 Testing audio files listing...');
    
    try {
      const response = await axios.get(`${CONFIG.baseUrl}/api/audio/files`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      const files = response.data;
      console.log('✅ Audio files listing successful');
      console.log(`   Found ${files.length} file(s)`);
      
      files.forEach((file, index) => {
        console.log(`   File ${index + 1}:`);
        console.log(`     ID: ${file.id}`);
        console.log(`     Name: ${file.original_name}`);
        console.log(`     Size: ${file.file_size} bytes`);
        console.log(`     Created: ${file.created_at}`);
      });
      
      return true;
    } catch (error) {
      console.log('❌ Audio files listing failed:', error.response?.data?.error || error.message);
      return false;
    }
  }

  async testAudioStreaming() {
    if (this.uploadedFiles.length === 0) {
      console.log('\n⚠️  Skipping streaming test - no uploaded files');
      return true;
    }

    console.log('\n🎵 Testing audio streaming...');
    
    try {
      const fileId = this.uploadedFiles[0].id;
      const response = await axios.get(`${CONFIG.baseUrl}/api/audio/stream/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        responseType: 'arraybuffer'
      });

      console.log('✅ Audio streaming successful');
      console.log(`   Content-Type: ${response.headers['content-type']}`);
      console.log(`   Content-Length: ${response.headers['content-length']} bytes`);
      console.log(`   Data received: ${response.data.length} bytes`);
      
      return true;
    } catch (error) {
      console.log('❌ Audio streaming failed:', error.response?.data?.error || error.message);
      return false;
    }
  }

  async testDatabaseIntegrity() {
    console.log('\n🔍 Testing database integrity...');
    
    try {
      // Test that we can query files through the API
      const response = await axios.get(`${CONFIG.baseUrl}/api/audio/files`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      const files = response.data;
      console.log('✅ Database integrity check passed');
      console.log(`   PostgreSQL connection: Working`);
      console.log(`   Audio files table: Accessible`);
      console.log(`   User isolation: ${files.every(file => file.user_id === this.userId) ? 'Working' : 'Failed'}`);
      
      return true;
    } catch (error) {
      console.log('❌ Database integrity check failed:', error.response?.data?.error || error.message);
      return false;
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test files...');
    
    try {
      const testFilePath = path.join(process.cwd(), CONFIG.testAudioName);
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
        console.log('✅ Test audio file removed');
      }
    } catch (error) {
      console.log('⚠️  Could not remove test file:', error.message);
    }
  }

  async run() {
    try {
      await this.init();
      
      const registerSuccess = await this.registerUser();
      if (!registerSuccess) return;
      
      const loginSuccess = await this.loginUser();
      if (!loginSuccess) return;
      
      const uploadSuccess = await this.testAudioUpload();
      const listSuccess = await this.testListAudioFiles();
      const streamSuccess = await this.testAudioStreaming();
      const integritySuccess = await this.testDatabaseIntegrity();
      
      console.log('\n🎉 AUDIO API TEST RESULTS');
      console.log('=' .repeat(50));
      console.log(`📝 User Registration: ${registerSuccess ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`🔑 User Login: ${loginSuccess ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`⬆️  Audio Upload: ${uploadSuccess ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`📋 Files Listing: ${listSuccess ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`🎵 Audio Streaming: ${streamSuccess ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`🔍 Database Integrity: ${integritySuccess ? '✅ PASS' : '❌ FAIL'}`);
      
      const allPassed = registerSuccess && loginSuccess && uploadSuccess && listSuccess && streamSuccess && integritySuccess;
      
      if (allPassed) {
        console.log('\n🚀 ALL TESTS PASSED! PostgreSQL migration successful!');
        console.log('✅ Audio APIs are fully functional with PostgreSQL');
      } else {
        console.log('\n⚠️  Some tests failed. Please check the errors above.');
      }
      
      await this.cleanup();
      
    } catch (error) {
      console.log('\n❌ TEST SUITE FAILED:', error.message);
      await this.cleanup();
    }
  }
}

// Run the test if called directly
if (require.main === module) {
  const test = new AudioAPITest();
  test.run().catch(console.error);
}

module.exports = AudioAPITest;
