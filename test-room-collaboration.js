#!/usr/bin/env node

/**
 * Test script for SyncSphere room collaboration
 * Simulates multiple users uploading audio files and compiling music together
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Configuration
const CONFIG = {
  userService: 'http://localhost:3001',
  audioService: 'http://localhost:3002', 
  sessionService: 'http://localhost:3003',
  outputDir: './test-output',
  audioFiles: [
    'Arctic Monkeys - Do I Wanna Know？ (Official Video)_bass.wav',
    'Arctic Monkeys - Do I Wanna Know？ (Official Video)_drums.wav', 
    'Arctic Monkeys - Do I Wanna Know？ (Official Video)_other.wav',
    'Arctic Monkeys - Do I Wanna Know？ (Official Video)_vocals.wav'
  ]
};

// Test users
const USERS = [
  { username: 'bassist', email: 'bassist@test.com', password: 'test123', instrument: 'bass' },
  { username: 'drummer', email: 'drummer@test.com', password: 'test123', instrument: 'drums' },
  { username: 'guitarist', email: 'guitarist@test.com', password: 'test123', instrument: 'other' },
  { username: 'vocalist', email: 'vocalist@test.com', password: 'test123', instrument: 'vocals' }
];

class RoomCollaborationTest {
  constructor() {
    this.tokens = {};
    this.uploadedFiles = {};
    this.roomId = null;
    this.sessionId = null;
  }

  async init() {
    console.log('🎵 Starting SyncSphere Room Collaboration Test');
    console.log('=' .repeat(50));
    
    // Create output directory
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
  }

  async checkServices() {
    console.log('\n🔍 Checking service availability...');
    
    const services = [
      { name: 'User Service', url: CONFIG.userService },
      { name: 'Audio Service', url: CONFIG.audioService },
      { name: 'Session Service', url: CONFIG.sessionService }
    ];

    for (const service of services) {
      try {
        await axios.get(`${service.url}/api/health`, { timeout: 5000 });
        console.log(`✅ ${service.name} is running`);
      } catch (error) {
        console.log(`❌ ${service.name} is not responding`);
        console.log(`   Please start with: cd services && npm start`);
        throw new Error(`${service.name} unavailable`);
      }
    }
  }

  async registerUsers() {
    console.log('\n👥 Registering test users...');
    
    for (const user of USERS) {
      try {
        const response = await axios.post(`${CONFIG.userService}/api/auth/register`, {
          username: user.username,
          email: user.email,
          password: user.password,
          musical_preferences: {
            genres: ['rock', 'alternative'],
            instruments: [user.instrument],
            collaboration_style: 'live'
          }
        });
        
        console.log(`✅ Registered user: ${user.username}`);
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`ℹ️  User ${user.username} already exists`);
        } else {
          console.log(`❌ Failed to register ${user.username}:`, error.message);
        }
      }
    }
  }

  async loginUsers() {
    console.log('\n🔐 Logging in users...');
    
    for (const user of USERS) {
      try {
        const response = await axios.post(`${CONFIG.userService}/api/auth/login`, {
          email: user.email,
          password: user.password
        });
        
        this.tokens[user.username] = response.data.token;
        console.log(`✅ Logged in: ${user.username}`);
      } catch (error) {
        console.log(`❌ Failed to login ${user.username}:`, error.message);
        throw error;
      }
    }
  }

  async createRoom() {
    console.log('\n🏠 Creating collaboration room...');
    
    try {
      const response = await axios.post(`${CONFIG.sessionService}/api/rooms`, {
        name: 'Arctic Monkeys Collaboration',
        description: 'Collaborative mixing of Do I Wanna Know?',
        isPublic: false,
        maxParticipants: 4,
        settings: {
          allowFileUpload: true,
          allowMixing: true,
          autoMix: false,
          audioFormat: 'wav',
          sampleRate: 44100,
          bitDepth: 16
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.tokens['bassist']}`,
          'Content-Type': 'application/json'
        }
      });
      
      this.roomId = response.data.room.id;
      console.log(`✅ Created room: ${this.roomId}`);
      console.log(`   Name: ${response.data.room.name}`);
      
    } catch (error) {
      console.log('❌ Failed to create room:', error.response?.data || error.message);
      throw error;
    }
  }

  async joinRoom() {
    console.log('\n🚪 Users joining room...');
    
    for (const user of USERS.slice(1)) { // Skip bassist (room creator)
      try {
        await axios.post(`${CONFIG.sessionService}/api/rooms/${this.roomId}/join`, {
          password: null
        }, {
          headers: {
            'Authorization': `Bearer ${this.tokens[user.username]}`
          }
        });
        
        console.log(`✅ ${user.username} joined the room`);
      } catch (error) {
        console.log(`❌ ${user.username} failed to join:`, error.response?.data || error.message);
      }
    }
  }

  async uploadFiles() {
    console.log('\n⬆️  Uploading audio files...');
    
    for (let i = 0; i < USERS.length; i++) {
      const user = USERS[i];
      const fileName = CONFIG.audioFiles[i];
      const filePath = path.join(process.cwd(), fileName);
      
      if (!fs.existsSync(filePath)) {
        console.log(`❌ File not found: ${fileName}`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('audio', fs.createReadStream(filePath));
        formData.append('title', `${user.instrument.toUpperCase()} - Do I Wanna Know?`);
        formData.append('artist', 'Arctic Monkeys');
        formData.append('genre', 'Alternative Rock');
        formData.append('roomId', this.roomId);
        formData.append('instrument', user.instrument);

        const response = await axios.post(`${CONFIG.audioService}/api/upload/single`, formData, {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${this.tokens[user.username]}`
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });

        this.uploadedFiles[user.instrument] = {
          fileId: response.data.file.id,
          fileName: response.data.file.filename,
          filePath: response.data.file.filePath,
          user: user.username
        };

        console.log(`✅ ${user.username} uploaded ${user.instrument} track`);
        console.log(`   File ID: ${response.data.file.id}`);
        
      } catch (error) {
        console.log(`❌ ${user.username} upload failed:`, error.response?.data || error.message);
      }
    }
  }

  async analyzeFiles() {
    console.log('\n🔍 Analyzing uploaded files...');
    
    for (const [instrument, fileInfo] of Object.entries(this.uploadedFiles)) {
      try {
        const response = await axios.get(`${CONFIG.audioService}/api/analysis/${fileInfo.fileId}`, {
          headers: {
            'Authorization': `Bearer ${this.tokens[fileInfo.user]}`
          }
        });
        
        const analysis = response.data.analysis;
        console.log(`✅ ${instrument} analysis complete:`);
        console.log(`   Duration: ${analysis.features.duration}s`);
        console.log(`   Tempo: ${analysis.features.tempo} BPM`);
        console.log(`   Key: ${analysis.features.key}`);
        
      } catch (error) {
        console.log(`❌ Analysis failed for ${instrument}:`, error.response?.data || error.message);
      }
    }
  }

  async mixTracks() {
    console.log('\n🎛️  Mixing all tracks together...');
    
    const fileIds = Object.values(this.uploadedFiles).map(file => file.fileId);
    
    try {
      const response = await axios.post(`${CONFIG.audioService}/api/process/mix`, {
        files: fileIds,
        settings: {
          outputFormat: 'wav',
          sampleRate: 44100,
          bitDepth: 16,
          normalize: true,
          fadeIn: 0,
          fadeOut: 2,
          tracks: [
            { fileId: this.uploadedFiles.bass?.fileId, volume: 0.8, pan: 0 },
            { fileId: this.uploadedFiles.drums?.fileId, volume: 0.9, pan: 0 },
            { fileId: this.uploadedFiles.other?.fileId, volume: 0.7, pan: -0.2 },
            { fileId: this.uploadedFiles.vocals?.fileId, volume: 1.0, pan: 0.1 }
          ]
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.tokens['bassist']}`, // Room creator does the mix
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Mix completed successfully!`);
      console.log(`   Output file: ${response.data.outputFile}`);
      console.log(`   Mix ID: ${response.data.mixId}`);
      
      return response.data;
      
    } catch (error) {
      console.log('❌ Mixing failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async downloadMix(mixData) {
    console.log('\n⬇️  Downloading final mix...');
    
    try {
      const response = await axios.get(`${CONFIG.audioService}/api/stream/${mixData.mixId}`, {
        headers: {
          'Authorization': `Bearer ${this.tokens['bassist']}`
        },
        responseType: 'stream'
      });
      
      const outputPath = path.join(CONFIG.outputDir, 'arctic_monkeys_collaboration_mix.wav');
      const writeStream = fs.createWriteStream(outputPath);
      
      response.data.pipe(writeStream);
      
      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
          console.log(`✅ Mix downloaded to: ${outputPath}`);
          resolve(outputPath);
        });
        writeStream.on('error', reject);
      });
      
    } catch (error) {
      console.log('❌ Download failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async generateReport() {
    console.log('\n📊 Generating collaboration report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      room: {
        id: this.roomId,
        name: 'Arctic Monkeys Collaboration',
        participants: USERS.length
      },
      files: this.uploadedFiles,
      summary: {
        totalTracks: Object.keys(this.uploadedFiles).length,
        instruments: Object.keys(this.uploadedFiles),
        users: Object.values(this.uploadedFiles).map(f => f.user)
      }
    };
    
    const reportPath = path.join(CONFIG.outputDir, 'collaboration_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`✅ Report saved to: ${reportPath}`);
    return report;
  }

  async run() {
    try {
      await this.init();
      await this.checkServices();
      await this.registerUsers();
      await this.loginUsers();
      await this.createRoom();
      await this.joinRoom();
      await this.uploadFiles();
      await this.analyzeFiles();
      const mixData = await this.mixTracks();
      const outputPath = await this.downloadMix(mixData);
      const report = await this.generateReport();
      
      console.log('\n🎉 COLLABORATION TEST COMPLETED SUCCESSFULLY!');
      console.log('=' .repeat(50));
      console.log(`🎵 Final mix: ${outputPath}`);
      console.log(`📊 Report: ${path.join(CONFIG.outputDir, 'collaboration_report.json')}`);
      console.log(`🏠 Room ID: ${this.roomId}`);
      console.log(`👥 Participants: ${report.summary.users.join(', ')}`);
      console.log(`🎸 Instruments: ${report.summary.instruments.join(', ')}`);
      
    } catch (error) {
      console.log('\n❌ TEST FAILED:', error.message);
      console.log('\nMake sure all services are running:');
      console.log('  cd services/user-service && npm start');
      console.log('  cd services/audio-service && npm start');
      console.log('  cd services/session-service && npm start');
      process.exit(1);
    }
  }
}

// Run the test if called directly
if (require.main === module) {
  const test = new RoomCollaborationTest();
  test.run().catch(console.error);
}

module.exports = RoomCollaborationTest;
