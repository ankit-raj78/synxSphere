import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import { createLogger } from '../utils/logger';
import { AudioAnalysis, AudioMixingSettings } from '../../../shared/types';

const logger = createLogger('AudioProcessor');

export class AudioProcessor {
  constructor() {
    // Initialize any required setup
  }

  /**
   * Mix multiple audio tracks into a single output file
   */
  async mixAudioTracks(
    tracks: Array<{ file: string; volume?: number; delay?: number }>,
    outputPath: string,
    settings?: AudioMixingSettings
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      logger.info('Starting audio mixing process', { 
        trackCount: tracks.length, 
        outputPath,
        settings 
      });

      try {
        let command = ffmpeg();

        // Add input files with their settings
        tracks.forEach((track, index) => {
          command = command.input(track.file);
          
          if (track.volume !== undefined && track.volume !== 1.0) {
            command = command.audioFilter(`[${index}:0]volume=${track.volume}[a${index}]`);
          }
        });

        // Create filter complex for mixing
        const filterInputs = tracks.map((_, index) => 
          tracks[index].volume !== undefined && tracks[index].volume !== 1.0 
            ? `[a${index}]` 
            : `[${index}:0]`
        ).join('');

        const mixFilter = `${filterInputs}amix=inputs=${tracks.length}:duration=longest:dropout_transition=2`;
        
        command = command
          .complexFilter([mixFilter])
          .audioCodec(settings?.codec || 'libmp3lame')
          .audioBitrate(settings?.bitrate || '192k')
          .audioFrequency(settings?.sampleRate || 44100)
          .format(settings?.format || 'mp3')
          .output(outputPath)
          .on('start', (commandLine) => {
            logger.info('FFmpeg process started', { commandLine });
          })
          .on('progress', (progress) => {
            logger.debug('Processing progress', { 
              percent: progress.percent,
              currentTime: progress.timemark 
            });
          })
          .on('end', () => {
            logger.info('Audio mixing completed successfully', { outputPath });
            resolve(outputPath);
          })
          .on('error', (err) => {
            logger.error('Audio mixing failed', { error: err.message, outputPath });
            reject(new Error(`Audio mixing failed: ${err.message}`));
          });

        command.run();
      } catch (error) {
        logger.error('Error setting up audio mixing', { error });
        reject(error);
      }
    });
  }

  /**
   * Analyze audio file properties
   */
  async analyzeAudio(filePath: string): Promise<AudioAnalysis> {
    return new Promise((resolve, reject) => {
      logger.info('Starting audio analysis', { filePath });

      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          logger.error('Audio analysis failed', { error: err.message, filePath });
          reject(new Error(`Audio analysis failed: ${err.message}`));
          return;
        }

        try {
          const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
          
          if (!audioStream) {
            throw new Error('No audio stream found in file');
          }

          const audioFeatures: any = {
            duration: parseFloat(String(metadata.format.duration || '0')),
            sampleRate: parseInt(String(audioStream.sample_rate || '0')),
            bitRate: parseInt(String(audioStream.bit_rate || metadata.format.bit_rate || '0')),
            tempo: 0, // Would need additional analysis
            timeSignature: '4/4', // Would need additional analysis
            key: 'C', // Would need additional analysis
            energy: 0, // Would need additional analysis
            loudness: 0, // Would need additional analysis
            spectralCentroid: 0, // Would need additional analysis
            spectralBandwidth: 0, // Would need additional analysis
            mfcc: [], // Would need additional analysis
            chroma: [], // Would need additional analysis
            harmonicComplexity: 0, // Would need additional analysis
            rhythmicComplexity: 0, // Would need additional analysis
            extractedAt: new Date()
          };

          const analysis: AudioAnalysis = {
            id: '', // Will be set by caller
            fileId: '', // Will be set by caller
            file_id: '', // Will be set by caller for database compatibility
            userId: '', // Will be set by caller
            features: audioFeatures,
            createdAt: new Date(),
            created_at: new Date(), // For database compatibility
            updated_at: new Date(), // For database compatibility
            // Additional flat properties for backward compatibility
            duration: audioFeatures.duration,
            sample_rate: audioFeatures.sampleRate,
            channels: audioStream.channels || 0,
            bit_rate: audioFeatures.bitRate,
            codec: audioStream.codec_name || 'unknown',
            format: metadata.format.format_name || 'unknown',
            size: parseInt(String(metadata.format.size || '0')),
            analyzed_at: new Date()
          };

          logger.info('Audio analysis completed', { 
            filePath, 
            duration: analysis.duration,
            sampleRate: analysis.sample_rate,
            channels: analysis.channels 
          });

          resolve(analysis);
        } catch (error) {
          logger.error('Error processing audio metadata', { error });
          reject(error);
        }
      });
    });
  }

  /**
   * Convert audio file to different format
   */
  async convertAudio(
    inputPath: string, 
    outputPath: string, 
    options: {
      format?: string;
      codec?: string;
      bitrate?: string;
      sampleRate?: number;
      channels?: number;
    } = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      logger.info('Starting audio conversion', { inputPath, outputPath, options });

      let command = ffmpeg(inputPath);

      if (options.codec) {
        command = command.audioCodec(options.codec);
      }
      if (options.bitrate) {
        command = command.audioBitrate(options.bitrate);
      }
      if (options.sampleRate) {
        command = command.audioFrequency(options.sampleRate);
      }
      if (options.channels) {
        command = command.audioChannels(options.channels);
      }
      if (options.format) {
        command = command.format(options.format);
      }

      command
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.info('FFmpeg conversion started', { commandLine });
        })
        .on('progress', (progress) => {
          logger.debug('Conversion progress', { 
            percent: progress.percent,
            currentTime: progress.timemark 
          });
        })
        .on('end', () => {
          logger.info('Audio conversion completed', { inputPath, outputPath });
          resolve(outputPath);
        })
        .on('error', (err) => {
          logger.error('Audio conversion failed', { error: err.message, inputPath, outputPath });
          reject(new Error(`Audio conversion failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Apply audio effects
   */
  async applyEffects(
    inputPath: string,
    outputPath: string,
    effects: Array<{
      type: 'volume' | 'reverb' | 'echo' | 'highpass' | 'lowpass' | 'normalize';
      params: Record<string, any>;
    }>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      logger.info('Applying audio effects', { inputPath, outputPath, effects });

      let command = ffmpeg(inputPath);
      const filters: string[] = [];

      effects.forEach((effect) => {
        switch (effect.type) {
          case 'volume':
            filters.push(`volume=${effect.params.level || 1.0}`);
            break;
          case 'reverb':
            filters.push(`aecho=0.8:0.9:${effect.params.delay || 1000}:${effect.params.decay || 0.3}`);
            break;
          case 'echo':
            filters.push(`aecho=${effect.params.inGain || 0.6}:${effect.params.outGain || 0.3}:${effect.params.delays || '60|100'}:${effect.params.decays || '0.4|0.3'}`);
            break;
          case 'highpass':
            filters.push(`highpass=f=${effect.params.frequency || 200}`);
            break;
          case 'lowpass':
            filters.push(`lowpass=f=${effect.params.frequency || 3000}`);
            break;
          case 'normalize':
            filters.push('loudnorm');
            break;
        }
      });

      if (filters.length > 0) {
        command = command.audioFilters(filters);
      }

      command
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.info('FFmpeg effects processing started', { commandLine });
        })
        .on('progress', (progress) => {
          logger.debug('Effects processing progress', { 
            percent: progress.percent,
            currentTime: progress.timemark 
          });
        })
        .on('end', () => {
          logger.info('Audio effects applied successfully', { inputPath, outputPath });
          resolve(outputPath);
        })
        .on('error', (err) => {
          logger.error('Audio effects processing failed', { error: err.message });
          reject(new Error(`Audio effects processing failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Extract audio segment
   */
  async extractSegment(
    inputPath: string,
    outputPath: string,
    startTime: number,
    duration: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      logger.info('Extracting audio segment', { 
        inputPath, 
        outputPath, 
        startTime, 
        duration 
      });

      ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(duration)
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.info('FFmpeg segment extraction started', { commandLine });
        })
        .on('end', () => {
          logger.info('Audio segment extracted successfully', { 
            inputPath, 
            outputPath,
            startTime,
            duration 
          });
          resolve(outputPath);
        })
        .on('error', (err) => {
          logger.error('Audio segment extraction failed', { error: err.message });
          reject(new Error(`Audio segment extraction failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Clean up temporary files
   */
  async cleanup(filePaths: string[]): Promise<void> {
    const cleanupPromises = filePaths.map(async (filePath) => {
      try {
        await fs.unlink(filePath);
        logger.debug('Cleaned up temporary file', { filePath });
      } catch (error) {
        logger.warn('Failed to cleanup file', { filePath, error });
      }
    });

    await Promise.all(cleanupPromises);
  }

  /**
   * Get supported formats
   */
  getSupportedFormats(): { input: string[]; output: string[] } {
    return {
      input: ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma'],
      output: ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg']
    };
  }
}

export default new AudioProcessor();
