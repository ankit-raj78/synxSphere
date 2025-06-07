#!/usr/bin/env node

/**
 * Simple Audio Mixing Test - No Database Required
 * Tests the audio processing functionality by combining 4 Arctic Monkeys WAV files
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Configuration
const CONFIG = {
  audioService: 'http://localhost:3002',
  outputDir: './test-output',
  audioFiles: [
    'Arctic Monkeys - Do I Wanna Know？ (Official Video)_bass.wav',
    'Arctic Monkeys - Do I Wanna Know？ (Official Video)_drums.wav', 
    'Arctic Monkeys - Do I Wanna Know？ (Official Video)_other.wav',
    'Arctic Monkeys - Do I Wanna Know？ (Official Video)_vocals.wav'
  ]
};

class SimpleAudioMixTest {
  constructor() {
    this.uploadedFiles = {};
  }

  async init() {
    console.log('🎵 Simple Audio Mixing Test (No Database)');
    console.log('=' .repeat(50));
    
    // Create output directory
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    // Check if WAV files exist
    for (const fileName of CONFIG.audioFiles) {
      const filePath = path.join(process.cwd(), fileName);
      if (!fs.existsSync(filePath)) {
        throw new Error(`WAV file not found: ${fileName}`);
      }
    }
    console.log('✅ All WAV files found');
  }

  async checkService() {
    console.log('\n🔍 Checking audio service...');
    
    try {
      const response = await axios.get(`${CONFIG.audioService}/api/health`, { timeout: 5000 });
      console.log(`✅ Audio Service is running (${response.data.mode})`);
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Version: ${response.data.version}`);
    } catch (error) {
      console.log('❌ Audio Service is not responding');
      console.log('   Please start with: cd services/audio-service && npm run standalone');
      throw new Error('Audio Service unavailable');
    }
  }

  async uploadFiles() {
    console.log('\n⬆️  Uploading audio files...');
    
    const instruments = ['bass', 'drums', 'other', 'vocals'];
    
    for (let i = 0; i < CONFIG.audioFiles.length; i++) {
      const fileName = CONFIG.audioFiles[i];
      const instrument = instruments[i];
      const filePath = path.join(process.cwd(), fileName);

      try {
        const formData = new FormData();
        formData.append('audio', fs.createReadStream(filePath));
        formData.append('title', `${instrument.toUpperCase()} - Do I Wanna Know?`);
        formData.append('artist', 'Arctic Monkeys');
        formData.append('genre', 'Alternative Rock');
        formData.append('instrument', instrument);

        console.log(`   Uploading ${instrument} track...`);
        
        const response = await axios.post(`${CONFIG.audioService}/api/upload/single`, formData, {
          headers: {
            ...formData.getHeaders()
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 60000
        });

        this.uploadedFiles[instrument] = {
          fileId: response.data.file.id,
          fileName: response.data.file.filename,
          filePath: response.data.file.filePath,
          originalName: fileName
        };

        console.log(`✅ ${instrument} uploaded successfully`);
        console.log(`   File ID: ${response.data.file.id}`);
        
      } catch (error) {
        console.log(`❌ ${instrument} upload failed:`, error.response?.data?.error || error.message);
        // Continue with other files
      }
    }

    const uploadedCount = Object.keys(this.uploadedFiles).length;
    console.log(`\n📊 Successfully uploaded ${uploadedCount}/${CONFIG.audioFiles.length} files`);
  }

  async analyzeFiles() {
    console.log('\n🔍 Analyzing uploaded files...');
    
    for (const [instrument, fileInfo] of Object.entries(this.uploadedFiles)) {
      try {
        console.log(`   Analyzing ${instrument}...`);
        
        const response = await axios.get(`${CONFIG.audioService}/api/analysis/${fileInfo.fileId}`, {
          timeout: 30000
        });
        
        const analysis = response.data.analysis;
        console.log(`✅ ${instrument} analysis:`);
        console.log(`   Duration: ${analysis.features.duration}s`);
        console.log(`   Tempo: ${analysis.features.tempo} BPM`);
        console.log(`   Key: ${analysis.features.key}`);
        
      } catch (error) {
        console.log(`❌ Analysis failed for ${instrument}:`, error.response?.data?.error || error.message);
      }
    }
  }

  async mixTracks() {
    console.log('\n🎛️  Mixing all tracks together...');
    
    const fileIds = Object.values(this.uploadedFiles).map(file => file.fileId);
    
    if (fileIds.length === 0) {
      throw new Error('No files available for mixing');
    }

    try {
      const mixingSettings = {
        outputFormat: 'wav',
        sampleRate: 44100,
        bitDepth: 16,
        normalize: true,
        fadeIn: 0,
        fadeOut: 2,
        tracks: []
      };

      // Add tracks with individual settings
      if (this.uploadedFiles.bass) {
        mixingSettings.tracks.push({ fileId: this.uploadedFiles.bass.fileId, volume: 0.8, pan: 0 });
      }
      if (this.uploadedFiles.drums) {
        mixingSettings.tracks.push({ fileId: this.uploadedFiles.drums.fileId, volume: 0.9, pan: 0 });
      }
      if (this.uploadedFiles.other) {
        mixingSettings.tracks.push({ fileId: this.uploadedFiles.other.fileId, volume: 0.7, pan: -0.2 });
      }
      if (this.uploadedFiles.vocals) {
        mixingSettings.tracks.push({ fileId: this.uploadedFiles.vocals.fileId, volume: 1.0, pan: 0.1 });
      }

      console.log(`   Mixing ${fileIds.length} tracks...`);
      
      const response = await axios.post(`${CONFIG.audioService}/api/process/mix`, {
        files: fileIds,
        settings: mixingSettings
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 minutes for mixing
      });
      
      console.log(`✅ Mix completed successfully!`);
      console.log(`   Output file: ${response.data.outputFile}`);
      console.log(`   Mix ID: ${response.data.mixId}`);
      
      return response.data;
      
    } catch (error) {
      console.log('❌ Mixing failed:', error.response?.data?.error || error.message);
      throw error;
    }
  }

  async downloadMix(mixData) {
    console.log('\n⬇️  Downloading final mix...');
    
    try {
      const response = await axios.get(`${CONFIG.audioService}/api/stream/${mixData.mixId}`, {
        responseType: 'stream',
        timeout: 60000
      });
      
      const outputPath = path.join(CONFIG.outputDir, 'arctic_monkeys_simple_mix.wav');
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
      console.log('❌ Download failed:', error.response?.data?.error || error.message);
      throw error;
    }
  }

  async testDirectMixing() {
    console.log('\n🧪 Testing direct file mixing (fallback method)...');
    
    try {
      const response = await axios.post(`${CONFIG.audioService}/api/test/combine`, {
        files: CONFIG.audioFiles,
        outputName: 'arctic_monkeys_direct_mix.wav'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Direct mixing test successful:');
      console.log(`   Files to process: ${response.data.files.length}`);
      console.log(`   Output name: ${response.data.outputName}`);
      console.log(`   Status: ${response.data.status}`);
      
    } catch (error) {
      console.log('❌ Direct mixing test failed:', error.response?.data?.error || error.message);
    }
  }

  async run() {
    try {
      await this.init();
      await this.checkService();
      await this.testDirectMixing();
      await this.uploadFiles();
      
      if (Object.keys(this.uploadedFiles).length > 0) {
        await this.analyzeFiles();
        const mixData = await this.mixTracks();
        const outputPath = await this.downloadMix(mixData);
        
        console.log('\n🎉 AUDIO MIXING TEST COMPLETED SUCCESSFULLY!');
        console.log('=' .repeat(50));
        console.log(`🎵 Final mix: ${outputPath}`);
        console.log(`📊 Tracks mixed: ${Object.keys(this.uploadedFiles).join(', ')}`);
        
      } else {
        console.log('\n⚠️  No files were uploaded successfully');
        console.log('Testing with direct file access instead...');
      }
      
    } catch (error) {
      console.log('\n❌ TEST FAILED:', error.message);
      console.log('\nMake sure the audio service is running:');
      console.log('  cd services/audio-service && npm run standalone');
      process.exit(1);
    }
  }
}

// Run the test if called directly
if (require.main === module) {
  const test = new SimpleAudioMixTest();
  test.run().catch(console.error);
}

module.exports = SimpleAudioMixTest;
