#!/usr/bin/env node

/**
 * Quick Audio Upload Test - Tests the fixed file.name handling
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  testUser: {
    email: 'audiotest@example.com',
    password: 'testpassword123'
  }
};

class QuickAudioTest {
  constructor() {
    this.token = null;
  }

  async loginUser() {
    console.log('🔑 Logging in test user...');
    
    try {
      const response = await axios.post(`${CONFIG.baseUrl}/api/auth/login`, {
        email: CONFIG.testUser.email,
        password: CONFIG.testUser.password
      });

      this.token = response.data.token;
      console.log('✅ Login successful');
      return true;
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data?.error || error.message);
      return false;
    }
  }

  async testAudioUpload() {
    console.log('⬆️  Testing audio file upload (with fixed file.name handling)...');
    
    try {
      // Create a test audio file with proper content
      const testContent = Buffer.from('RIFF....WAVEfmt ');
      const testFilePath = path.join(process.cwd(), 'test-upload.wav');
      fs.writeFileSync(testFilePath, testContent);

      const formData = new FormData();
      formData.append('audio', fs.createReadStream(testFilePath));

      console.log('   Sending request to /api/audio/upload...');
      
      const response = await axios.post(`${CONFIG.baseUrl}/api/audio/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.token}`
        },
        timeout: 30000
      });

      console.log('✅ Audio upload successful!');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
      
      // Clean up test file
      fs.unlinkSync(testFilePath);
      
      return true;
    } catch (error) {
      console.log('❌ Audio upload failed:');
      console.log('   Error:', error.response?.data?.error || error.message);
      if (error.response?.data) {
        console.log('   Full response:', JSON.stringify(error.response.data, null, 2));
      }
      if (error.stack) {
        console.log('   Stack trace:', error.stack);
      }
      
      // Clean up test file
      try {
        const testFilePath = path.join(process.cwd(), 'test-upload.wav');
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      } catch (e) {}
      
      return false;
    }
  }

  async run() {
    console.log('🎵 Quick Audio Upload Test');
    console.log('Testing fixed file.name handling');
    console.log('=' .repeat(40));
    
    const loginSuccess = await this.loginUser();
    if (!loginSuccess) {
      console.log('Cannot proceed without login');
      return;
    }
    
    const uploadSuccess = await this.testAudioUpload();
    
    console.log('\n📊 Test Results:');
    console.log(`🔑 Login: ${loginSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`⬆️  Upload: ${uploadSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    if (uploadSuccess) {
      console.log('\n🎉 Audio upload is now working!');
      console.log('✅ file.name handling has been fixed');
    } else {
      console.log('\n⚠️  Audio upload still has issues');
    }
  }
}

// Run the test
const test = new QuickAudioTest();
test.run().catch(console.error);
