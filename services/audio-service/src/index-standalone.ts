import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.SERVICE_PORT || 3006;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'audio-analysis-standalone',
    timestamp: new Date().toISOString()
  });
});

// Audio metadata extraction endpoint
app.post('/analyze', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    console.log('🎵 [AUDIO-SERVICE] Starting metadata extraction for:', filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Extract metadata using ffprobe
    const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`);
    const metadata = JSON.parse(stdout);
    
    console.log('🎵 [AUDIO-SERVICE] Raw ffprobe metadata:', JSON.stringify(metadata, null, 2));
    
    const audioStream = metadata.streams.find((stream: any) => stream.codec_type === 'audio');
    
    if (!audioStream) {
      return res.status(400).json({ error: 'No audio stream found in file' });
    }

    const result = {
      duration: parseFloat(metadata.format.duration || '0'),
      sampleRate: parseInt(audioStream.sample_rate || '0'),
      channels: parseInt(audioStream.channels || '0'),
      bitRate: parseInt(audioStream.bit_rate || metadata.format.bit_rate || '0'),
      format: metadata.format.format_name || 'unknown',
      codec: audioStream.codec_name || 'unknown',
      fileSize: parseInt(metadata.format.size || '0'),
      analyzedAt: new Date().toISOString()
    };

    console.log('🎵 [AUDIO-SERVICE] Extracted metadata:', result);
    
    res.json({
      success: true,
      metadata: result
    });

  } catch (error) {
    console.error('🎵 [AUDIO-SERVICE] Error extracting metadata:', error);
    res.status(500).json({ 
      error: 'Failed to extract audio metadata',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Batch analysis endpoint
app.post('/analyze-batch', async (req, res) => {
  try {
    const { filePaths } = req.body;
    
    if (!Array.isArray(filePaths)) {
      return res.status(400).json({ error: 'filePaths must be an array' });
    }

    console.log('🎵 [AUDIO-SERVICE] Starting batch metadata extraction for:', filePaths.length, 'files');

    const results = [];
    
    for (const filePath of filePaths) {
      try {
        if (!fs.existsSync(filePath)) {
          results.push({ filePath, error: 'File not found' });
          continue;
        }

        const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`);
        const metadata = JSON.parse(stdout);
        
        const audioStream = metadata.streams.find((stream: any) => stream.codec_type === 'audio');
        
        if (!audioStream) {
          results.push({ filePath, error: 'No audio stream found' });
          continue;
        }

        const result = {
          filePath,
          duration: parseFloat(metadata.format.duration || '0'),
          sampleRate: parseInt(audioStream.sample_rate || '0'),
          channels: parseInt(audioStream.channels || '0'),
          bitRate: parseInt(audioStream.bit_rate || metadata.format.bit_rate || '0'),
          format: metadata.format.format_name || 'unknown',
          codec: audioStream.codec_name || 'unknown',
          fileSize: parseInt(metadata.format.size || '0'),
          analyzedAt: new Date().toISOString()
        };

        results.push(result);
        
      } catch (error) {
        console.error('🎵 [AUDIO-SERVICE] Error processing file:', filePath, error);
        results.push({ 
          filePath, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    console.log('🎵 [AUDIO-SERVICE] Batch analysis completed:', results.length, 'results');
    
    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('🎵 [AUDIO-SERVICE] Batch analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to process batch analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🎵 [AUDIO-SERVICE] Standalone audio analysis service running on port ${PORT}`);
  console.log(`🎵 [AUDIO-SERVICE] Health check: http://localhost:${PORT}/health`);
  console.log(`🎵 [AUDIO-SERVICE] Analysis endpoint: http://localhost:${PORT}/analyze`);
  console.log(`🎵 [AUDIO-SERVICE] Batch analysis endpoint: http://localhost:${PORT}/analyze-batch`);
});
