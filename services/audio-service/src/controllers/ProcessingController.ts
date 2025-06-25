import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../../lib/prisma';
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

      // Get track files from database using Prisma
      const tracks = await prisma.audioFile.findMany({
        where: {
          id: { in: trackIds },
          userId: userId
        }
      });

      if (tracks.length !== trackIds.length) {
        res.status(404).json({ error: 'Some tracks not found or not accessible' });
        return;
      }

      // Prepare tracks for mixing
      const mixingTracks = tracks.map((track: any, index: number) => {
        const filePath = track.filePath;
        if (!filePath) {
          throw new Error(`File path not found for track ${track.id}`);
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

      // Save mixed file to database using Prisma
      const mixedFile = await prisma.audioFile.create({
        data: {
          id: uuidv4(),
          userId: userId,
          filename: outputFileName,
          originalName: outputFileName,
          filePath: mixedFilePath,
          fileSize: (await fs.stat(mixedFilePath)).size,
          mimeType: 'audio/mpeg',
          duration: analysis.duration,
          sampleRate: analysis.sample_rate,
          channels: analysis.channels,
          bitRate: analysis.bit_rate,
          format: analysis.format,
          isProcessed: true
        }
      });

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

      // Get original file using Prisma
      const originalFile = await prisma.audioFile.findFirst({
        where: {
          id: fileId,
          userId: userId
        }
      });

      if (!originalFile) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      // Generate output file path
      const outputFileName = outputName || `effects_${Date.now()}.mp3`;
      const outputPath = path.resolve('processed/audio', outputFileName);

      // Apply effects
      const originalFilePath = originalFile.filePath;
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

      // Save processed file to database using Prisma
      const processedFile = await prisma.audioFile.create({
        data: {
          id: uuidv4(),
          userId: userId,
          filename: outputFileName,
          originalName: outputFileName,
          filePath: processedFilePath,
          fileSize: (await fs.stat(processedFilePath)).size,
          mimeType: 'audio/mpeg',
          duration: analysis.duration,
          sampleRate: analysis.sample_rate,
          channels: analysis.channels,
          bitRate: analysis.bit_rate,
          format: analysis.format,
          isProcessed: true
        }
      });

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

      // Get original file using Prisma
      const originalFile = await prisma.audioFile.findFirst({
        where: {
          id: fileId,
          userId: userId
        }
      });

      if (!originalFile) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      // Generate output file path
      const outputFileName = `converted_${Date.now()}.${targetFormat}`;
      const outputPath = path.resolve('processed/audio', outputFileName);

      // Convert format
      const originalFilePath2 = originalFile.filePath;
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

      // Save converted file to database using Prisma
      const convertedFile = await prisma.audioFile.create({
        data: {
          id: uuidv4(),
          userId: userId,
          filename: outputFileName,
          originalName: outputFileName,
          filePath: convertedFilePath,
          fileSize: (await fs.stat(convertedFilePath)).size,
          mimeType: `audio/${targetFormat}`,
          duration: analysis.duration,
          sampleRate: analysis.sample_rate,
          channels: analysis.channels,
          bitRate: analysis.bit_rate,
          format: analysis.format,
          isProcessed: true
        }
      });

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

      // Get original file using Prisma
      const originalFile = await prisma.audioFile.findFirst({
        where: {
          id: fileId,
          userId: userId
        }
      });

      if (!originalFile) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      // Generate output file path
      const outputFileName = outputName || `segment_${Date.now()}.mp3`;
      const outputPath = path.resolve('processed/audio', outputFileName);

      // Extract segment
      const originalFilePath3 = originalFile.filePath;
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

      // Save segment to database using Prisma
      const segmentFile = await prisma.audioFile.create({
        data: {
          id: uuidv4(),
          userId: userId,
          filename: outputFileName,
          originalName: outputFileName,
          filePath: segmentFilePath,
          fileSize: (await fs.stat(segmentFilePath)).size,
          mimeType: 'audio/mpeg',
          duration: analysis.duration,
          sampleRate: analysis.sample_rate,
          channels: analysis.channels,
          bitRate: analysis.bit_rate,
          format: analysis.format,
          isProcessed: true
        }
      });

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
