import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import DatabaseManager from '../../../shared/config/database';
import { AudioFile, AudioMixingSettings } from '../../../shared/types';
import { createLogger } from '../utils/logger';
import AudioProcessor from '../services/AudioProcessor';

const logger = createLogger('ProcessingController');

export class ProcessingController {
  /**
   * Mix multiple audio tracks
   */
  async mixTracks(req: Request, res: Response): Promise<void> {
    try {
      const { trackIds, settings, outputName } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!trackIds || !Array.isArray(trackIds) || trackIds.length === 0) {
        res.status(400).json({ error: 'Track IDs are required' });
        return;
      }

      logger.info('Starting track mixing process', { 
        trackIds, 
        userId, 
        settings 
      });

      // Get track files from database
      const trackQuery = `
        SELECT * FROM audio_files 
        WHERE id = ANY($1) AND user_id = $2
      `;
      
      const trackResult = await DatabaseManager.executeQuery<AudioFile>(
        trackQuery, 
        [trackIds, userId]
      );

      if (trackResult.rows.length !== trackIds.length) {
        res.status(404).json({ error: 'Some tracks not found or not accessible' });
        return;
      }

      const tracks = trackResult.rows;

      // Prepare tracks for mixing
      const mixingTracks = tracks.map((track, index) => {
        const filePath = track.file_path || track.filepath;
        if (!filePath) {
          throw new Error(`File path not found for track ${track._id || track.id}`);
        }
        return {
          file: filePath,
          volume: settings?.tracks?.[index]?.volume || 1.0,
          delay: settings?.tracks?.[index]?.delay || 0
        };
      });

      // Generate output file path
      const outputFileName = outputName || `mixed_${Date.now()}.mp3`;
      const outputPath = path.resolve('processed/audio', outputFileName);

      // Perform mixing
      const mixedFilePath = await AudioProcessor.mixAudioTracks(
        mixingTracks,
        outputPath,
        settings as AudioMixingSettings
      );

      // Analyze the mixed file
      const analysis = await AudioProcessor.analyzeAudio(mixedFilePath);

      // Save mixed file to database
      const mixedFileData: Partial<AudioFile> = {
        id: uuidv4(),
        user_id: userId,
        filename: outputFileName,
        original_name: outputFileName,
        file_path: mixedFilePath,
        file_size: (await fs.stat(mixedFilePath)).size,
        mime_type: 'audio/mpeg',
        duration: analysis.duration,
        sample_rate: analysis.sample_rate,
        channels: analysis.channels,
        bit_rate: analysis.bit_rate,
        format: analysis.format,
        is_processed: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const insertQuery = `
        INSERT INTO audio_files (
          id, user_id, filename, original_name, file_path, file_size, 
          mime_type, duration, sample_rate, channels, bit_rate, format, 
          is_processed, created_at, updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const insertValues = [
        mixedFileData.id,
        mixedFileData.user_id,
        mixedFileData.filename,
        mixedFileData.original_name,
        mixedFileData.file_path,
        mixedFileData.file_size,
        mixedFileData.mime_type,
        mixedFileData.duration,
        mixedFileData.sample_rate,
        mixedFileData.channels,
        mixedFileData.bit_rate,
        mixedFileData.format,
        mixedFileData.is_processed,
        mixedFileData.created_at,
        mixedFileData.updated_at
      ];

      const result = await DatabaseManager.executeQuery<AudioFile>(insertQuery, insertValues);
      const mixedFile = result.rows[0];

      logger.info('Track mixing completed successfully', { 
        mixedFileId: mixedFile.id,
        originalTrackCount: tracks.length,
        userId 
      });

      res.status(201).json({
        message: 'Tracks mixed successfully',
        mixedFile,
        originalTracks: tracks,
        downloadUrl: `/api/stream/download/${mixedFile.id}`
      });

    } catch (error) {
      logger.error('Track mixing failed', { error });
      res.status(500).json({ 
        error: 'Track mixing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Apply audio effects to a track
   */
  async applyEffects(req: Request, res: Response): Promise<void> {
    try {
      const { fileId, effects, outputName } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!fileId || !effects || !Array.isArray(effects)) {
        res.status(400).json({ error: 'File ID and effects are required' });
        return;
      }

      logger.info('Applying audio effects', { fileId, effects, userId });

      // Get original file
      const fileQuery = 'SELECT * FROM audio_files WHERE id = $1 AND user_id = $2';
      const fileResult = await DatabaseManager.executeQuery<AudioFile>(fileQuery, [fileId, userId]);

      if (fileResult.rows.length === 0) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const originalFile = fileResult.rows[0];

      // Generate output file path
      const outputFileName = outputName || `effects_${Date.now()}.mp3`;
      const outputPath = path.resolve('processed/audio', outputFileName);

      // Apply effects
      const originalFilePath = originalFile.file_path || originalFile.filepath;
      if (!originalFilePath) {
        res.status(400).json({ error: 'Original file path not found' });
        return;
      }
      
      const processedFilePath = await AudioProcessor.applyEffects(
        originalFilePath,
        outputPath,
        effects
      );

      // Analyze the processed file
      const analysis = await AudioProcessor.analyzeAudio(processedFilePath);

      // Save processed file to database
      const processedFileData: Partial<AudioFile> = {
        id: uuidv4(),
        user_id: userId,
        filename: outputFileName,
        original_name: outputFileName,
        file_path: processedFilePath,
        file_size: (await fs.stat(processedFilePath)).size,
        mime_type: 'audio/mpeg',
        duration: analysis.duration,
        sample_rate: analysis.sample_rate,
        channels: analysis.channels,
        bit_rate: analysis.bit_rate,
        format: analysis.format,
        is_processed: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const insertQuery = `
        INSERT INTO audio_files (
          id, user_id, filename, original_name, file_path, file_size, 
          mime_type, duration, sample_rate, channels, bit_rate, format, 
          is_processed, created_at, updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const insertValues = [
        processedFileData.id,
        processedFileData.user_id,
        processedFileData.filename,
        processedFileData.original_name,
        processedFileData.file_path,
        processedFileData.file_size,
        processedFileData.mime_type,
        processedFileData.duration,
        processedFileData.sample_rate,
        processedFileData.channels,
        processedFileData.bit_rate,
        processedFileData.format,
        processedFileData.is_processed,
        processedFileData.created_at,
        processedFileData.updated_at
      ];

      const result = await DatabaseManager.executeQuery<AudioFile>(insertQuery, insertValues);
      const processedFile = result.rows[0];

      logger.info('Audio effects applied successfully', { 
        processedFileId: processedFile.id,
        originalFileId: fileId,
        userId 
      });

      res.status(201).json({
        message: 'Effects applied successfully',
        processedFile,
        originalFile,
        downloadUrl: `/api/stream/download/${processedFile.id}`
      });

    } catch (error) {
      logger.error('Effect application failed', { error });
      res.status(500).json({ 
        error: 'Effect application failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Convert audio file format
   */
  async convertFormat(req: Request, res: Response): Promise<void> {
    try {
      const { fileId, targetFormat, options = {} } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!fileId || !targetFormat) {
        res.status(400).json({ error: 'File ID and target format are required' });
        return;
      }

      logger.info('Converting audio format', { fileId, targetFormat, options, userId });

      // Get original file
      const fileQuery = 'SELECT * FROM audio_files WHERE id = $1 AND user_id = $2';
      const fileResult = await DatabaseManager.executeQuery<AudioFile>(fileQuery, [fileId, userId]);

      if (fileResult.rows.length === 0) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const originalFile = fileResult.rows[0];

      // Generate output file path
      const outputFileName = `converted_${Date.now()}.${targetFormat}`;
      const outputPath = path.resolve('processed/audio', outputFileName);

      // Convert format
      const originalFilePath2 = originalFile.file_path || originalFile.filepath;
      if (!originalFilePath2) {
        res.status(400).json({ error: 'Original file path not found' });
        return;
      }
      
      const convertedFilePath = await AudioProcessor.convertAudio(
        originalFilePath2,
        outputPath,
        { format: targetFormat, ...options }
      );

      // Analyze the converted file
      const analysis = await AudioProcessor.analyzeAudio(convertedFilePath);

      // Save converted file to database
      const convertedFileData: Partial<AudioFile> = {
        id: uuidv4(),
        user_id: userId,
        filename: outputFileName,
        original_name: outputFileName,
        file_path: convertedFilePath,
        file_size: (await fs.stat(convertedFilePath)).size,
        mime_type: `audio/${targetFormat}`,
        duration: analysis.duration,
        sample_rate: analysis.sample_rate,
        channels: analysis.channels,
        bit_rate: analysis.bit_rate,
        format: analysis.format,
        is_processed: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const insertQuery = `
        INSERT INTO audio_files (
          id, user_id, filename, original_name, file_path, file_size, 
          mime_type, duration, sample_rate, channels, bit_rate, format, 
          is_processed, created_at, updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const insertValues = [
        convertedFileData.id,
        convertedFileData.user_id,
        convertedFileData.filename,
        convertedFileData.original_name,
        convertedFileData.file_path,
        convertedFileData.file_size,
        convertedFileData.mime_type,
        convertedFileData.duration,
        convertedFileData.sample_rate,
        convertedFileData.channels,
        convertedFileData.bit_rate,
        convertedFileData.format,
        convertedFileData.is_processed,
        convertedFileData.created_at,
        convertedFileData.updated_at
      ];

      const result = await DatabaseManager.executeQuery<AudioFile>(insertQuery, insertValues);
      const convertedFile = result.rows[0];

      logger.info('Audio conversion completed successfully', { 
        convertedFileId: convertedFile.id,
        originalFileId: fileId,
        targetFormat,
        userId 
      });

      res.status(201).json({
        message: 'Format conversion completed successfully',
        convertedFile,
        originalFile,
        downloadUrl: `/api/stream/download/${convertedFile.id}`
      });

    } catch (error) {
      logger.error('Format conversion failed', { error });
      res.status(500).json({ 
        error: 'Format conversion failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Extract audio segment
   */
  async extractSegment(req: Request, res: Response): Promise<void> {
    try {
      const { fileId, startTime, duration, outputName } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!fileId || startTime === undefined || duration === undefined) {
        res.status(400).json({ error: 'File ID, start time, and duration are required' });
        return;
      }

      logger.info('Extracting audio segment', { 
        fileId, 
        startTime, 
        duration, 
        userId 
      });

      // Get original file
      const fileQuery = 'SELECT * FROM audio_files WHERE id = $1 AND user_id = $2';
      const fileResult = await DatabaseManager.executeQuery<AudioFile>(fileQuery, [fileId, userId]);

      if (fileResult.rows.length === 0) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const originalFile = fileResult.rows[0];

      // Generate output file path
      const outputFileName = outputName || `segment_${Date.now()}.mp3`;
      const outputPath = path.resolve('processed/audio', outputFileName);

      // Extract segment
      const originalFilePath3 = originalFile.file_path || originalFile.filepath;
      if (!originalFilePath3) {
        res.status(400).json({ error: 'Original file path not found' });
        return;
      }
      
      const segmentFilePath = await AudioProcessor.extractSegment(
        originalFilePath3,
        outputPath,
        startTime,
        duration
      );

      // Analyze the segment
      const analysis = await AudioProcessor.analyzeAudio(segmentFilePath);

      // Save segment to database
      const segmentFileData: Partial<AudioFile> = {
        id: uuidv4(),
        user_id: userId,
        filename: outputFileName,
        original_name: outputFileName,
        file_path: segmentFilePath,
        file_size: (await fs.stat(segmentFilePath)).size,
        mime_type: 'audio/mpeg',
        duration: analysis.duration,
        sample_rate: analysis.sample_rate,
        channels: analysis.channels,
        bit_rate: analysis.bit_rate,
        format: analysis.format,
        is_processed: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const insertQuery = `
        INSERT INTO audio_files (
          id, user_id, filename, original_name, file_path, file_size, 
          mime_type, duration, sample_rate, channels, bit_rate, format, 
          is_processed, created_at, updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const insertValues = [
        segmentFileData.id,
        segmentFileData.user_id,
        segmentFileData.filename,
        segmentFileData.original_name,
        segmentFileData.file_path,
        segmentFileData.file_size,
        segmentFileData.mime_type,
        segmentFileData.duration,
        segmentFileData.sample_rate,
        segmentFileData.channels,
        segmentFileData.bit_rate,
        segmentFileData.format,
        segmentFileData.is_processed,
        segmentFileData.created_at,
        segmentFileData.updated_at
      ];

      const result = await DatabaseManager.executeQuery<AudioFile>(insertQuery, insertValues);
      const segmentFile = result.rows[0];

      logger.info('Audio segment extracted successfully', { 
        segmentFileId: segmentFile.id,
        originalFileId: fileId,
        startTime,
        duration,
        userId 
      });

      res.status(201).json({
        message: 'Audio segment extracted successfully',
        segmentFile,
        originalFile,
        downloadUrl: `/api/stream/download/${segmentFile.id}`
      });

    } catch (error) {
      logger.error('Segment extraction failed', { error });
      res.status(500).json({ 
        error: 'Segment extraction failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get processing status
   */
  async getProcessingStatus(req: Request, res: Response): Promise<void> {
    try {
      const processId = req.params.processId;
      
      // This would typically integrate with a Redis-based job queue
      // For now, we'll return a simple response
      
      res.json({
        processId,
        status: 'completed',
        progress: 100,
        message: 'Processing completed successfully'
      });

    } catch (error) {
      logger.error('Failed to get processing status', { error });
      res.status(500).json({ 
        error: 'Failed to get processing status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new ProcessingController();
