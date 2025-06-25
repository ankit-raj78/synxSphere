import { Request, Response } from 'express';
import fs from 'fs';
import { createReadStream, statSync } from 'fs';
import { prisma } from '../../../../lib/prisma';
import { AudioFile } from '../../../shared/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('StreamingController');

export class StreamingController {
  /**
   * Stream audio file with range support for progressive downloading
   */
  async streamAudio(req: Request, res: Response): Promise<void> {
    try {
      const fileId = req.params.fileId;
      const range = req.headers.range;

      if (!fileId) {
        res.status(400).json({ error: 'File ID is required' });
        return;
      }

      logger.info('Streaming audio file', { fileId, range });

      // Get file info from database using Prisma
      const audioFile = await prisma.audioFile.findUnique({
        where: { id: fileId }
      });

      if (!audioFile) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      // Check if file exists on disk
      const filePath = audioFile.filePath;
      if (!filePath) {
        res.status(400).json({ error: 'File path not found' });
        return;
      }
      
      if (!fs.existsSync(filePath)) {
        logger.error('Physical file not found', { 
          fileId, 
          filePath 
        });
        res.status(404).json({ error: 'File not found on disk' });
        return;
      }

      const stat = statSync(filePath);
      const fileSize = stat.size;

      if (range) {
        // Handle range requests for progressive streaming
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        const stream = createReadStream(filePath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': audioFile.mimeType || 'audio/mpeg',
          'Cache-Control': 'public, max-age=3600'
        });

        stream.pipe(res);
      } else {
        // Send entire file
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': audioFile.mimeType || 'audio/mpeg',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600'
        });

        const stream = createReadStream(filePath);
        stream.pipe(res);
      }

      logger.info('Audio streaming initiated', { 
        fileId, 
        fileSize, 
        hasRange: !!range 
      });

    } catch (error) {
      logger.error('Audio streaming failed', { error });
      res.status(500).json({ 
        error: 'Audio streaming failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Download audio file
   */
  async downloadAudio(req: Request, res: Response): Promise<void> {
    try {
      const fileId = req.params.fileId;
      const userId = (req as any).user?.id;

      if (!fileId) {
        res.status(400).json({ error: 'File ID is required' });
        return;
      }

      logger.info('Downloading audio file', { fileId, userId });

      // Get file info from database using Prisma
      const audioFile = await prisma.audioFile.findFirst({
        where: {
          id: fileId,
          ...(userId ? {
            OR: [
              { userId: userId },
              { isPublic: true }
            ]
          } : {
            isPublic: true
          })
        }
      });

      if (!audioFile) {
        res.status(404).json({ error: 'File not found or not accessible' });
        return;
      }

      // Check if file exists on disk
      const downloadFilePath = audioFile.filePath;
      if (!downloadFilePath) {
        res.status(400).json({ error: 'File path not found' });
        return;
      }
      
      if (!fs.existsSync(downloadFilePath)) {
        logger.error('Physical file not found for download', { 
          fileId, 
          filePath: downloadFilePath 
        });
        res.status(404).json({ error: 'File not found on disk' });
        return;
      }

      const stat = statSync(downloadFilePath);

      res.setHeader('Content-Disposition', `attachment; filename="${audioFile.originalName}"`);
      res.setHeader('Content-Type', audioFile.mimeType || 'audio/mpeg');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Cache-Control', 'no-cache');

      const stream = createReadStream(downloadFilePath);
      stream.pipe(res);

      logger.info('Audio download initiated', { 
        fileId, 
        fileName: audioFile.originalName,
        fileSize: stat.size 
      });

    } catch (error) {
      logger.error('Audio download failed', { error });
      res.status(500).json({ 
        error: 'Audio download failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get audio metadata for streaming clients
   */
  async getAudioMetadata(req: Request, res: Response): Promise<void> {
    try {
      const fileId = req.params.fileId;

      if (!fileId) {
        res.status(400).json({ error: 'File ID is required' });
        return;
      }

      logger.info('Getting audio metadata', { fileId });

      // Get file info and analysis from database using Prisma
      const audioFile = await prisma.audioFile.findUnique({
        where: { id: fileId },
        include: {
          analysis: true
        }
      });

      if (!audioFile) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      res.json({
        id: audioFile.id,
        filename: audioFile.originalName,
        duration: audioFile.analysis?.duration,
        format: audioFile.format,
        codec: audioFile.analysis?.codec,
        sampleRate: audioFile.analysis?.sampleRate,
        channels: audioFile.analysis?.channels,
        bitRate: audioFile.analysis?.bitRate,
        size: audioFile.fileSize,
        tempo: audioFile.analysis?.tempo,
        key: audioFile.analysis?.keySignature,
        loudness: audioFile.analysis?.loudness,
        mimeType: audioFile.mimeType,
        streamUrl: `/api/stream/audio/${fileId}`,
        downloadUrl: `/api/stream/download/${fileId}`
      });

      logger.info('Audio metadata retrieved', { fileId });

    } catch (error) {
      logger.error('Failed to get audio metadata', { error });
      res.status(500).json({ 
        error: 'Failed to get audio metadata',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get waveform data for visualization
   */
  async getWaveform(req: Request, res: Response): Promise<void> {
    try {
      const fileId = req.params.fileId;
      const width = parseInt(req.query.width as string) || 800;
      const height = parseInt(req.query.height as string) || 200;

      if (!fileId) {
        res.status(400).json({ error: 'File ID is required' });
        return;
      }

      logger.info('Generating waveform data', { fileId, width, height });

      // Get file info from database using Prisma
      const audioFile = await prisma.audioFile.findUnique({
        where: { id: fileId },
        include: {
          analysis: true
        }
      });

      if (!audioFile) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      let waveformData;

      if (audioFile.analysis?.waveformData) {
        waveformData = audioFile.analysis.waveformData;
        logger.info('Using cached waveform data', { fileId });
      } else {
        // Generate waveform data (simplified mock implementation)
        // In a real implementation, you'd use FFmpeg or similar to extract audio peaks
        waveformData = this.generateMockWaveform(width, Number(audioFile.duration) || 180);

        // Cache the waveform data
        if (audioFile.analysis) {
          await prisma.audioAnalysis.update({
            where: { fileId: fileId },
            data: { 
              waveformData: waveformData,
              updatedAt: new Date()
            }
          });
        }

        logger.info('Generated and cached waveform data', { fileId });
      }

      res.json({
        fileId,
        width,
        height,
        duration: audioFile.duration,
        waveform: Array.isArray(waveformData) ? waveformData : (typeof waveformData === 'string' ? JSON.parse(waveformData) : waveformData)
      });

    } catch (error) {
      logger.error('Waveform generation failed', { error });
      res.status(500).json({ 
        error: 'Waveform generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate mock waveform data for visualization
   * In production, this would use actual audio analysis
   */
  private generateMockWaveform(width: number, _duration: number): number[] {
    const waveform: number[] = [];
    // const samplesPerSecond = width / duration; // For future time-based effects

    for (let i = 0; i < width; i++) {
      // Generate mock amplitude values between 0 and 1
      // const time = i / samplesPerSecond; // Could be used for time-based effects
      const amplitude = Math.random() * 0.8 + 0.1; // Random amplitude with some base level
      waveform.push(Math.round(amplitude * 100) / 100); // Round to 2 decimal places
    }

    return waveform;
  }

  /**
   * Get playlist/queue for continuous streaming
   */
  async getPlaylist(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const roomId = req.query.roomId as string;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      logger.info('Getting playlist', { userId, roomId, limit });

      let audioFiles;

      if (roomId) {
        // Get room-specific playlist using Prisma
        audioFiles = await prisma.audioFile.findMany({
          where: { roomId: roomId },
          include: {
            analysis: {
              select: {
                duration: true,
                sampleRate: true,
                channels: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit
        });
      } else {
        // Get user's personal playlist using Prisma
        audioFiles = await prisma.audioFile.findMany({
          where: {
            userId: userId,
            OR: [
              { roomId: null },
              { isPublic: true }
            ]
          },
          include: {
            analysis: {
              select: {
                duration: true,
                sampleRate: true,
                channels: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit
        });
      }

      const playlist = audioFiles.map(file => ({
        id: file.id,
        title: file.originalName,
        duration: file.analysis?.duration,
        artist: (file.metadata as any)?.artist || 'Unknown Artist',
        streamUrl: `/api/stream/audio/${file.id}`,
        downloadUrl: `/api/stream/download/${file.id}`,
        metadata: {
          sampleRate: file.analysis?.sampleRate,
          channels: file.analysis?.channels,
          format: file.format,
          size: file.fileSize
        }
      }));

      res.json({
        playlist,
        totalTracks: playlist.length,
        roomId,
        userId
      });

      logger.info('Playlist retrieved', { 
        userId, 
        roomId, 
        trackCount: playlist.length 
      });

    } catch (error) {
      logger.error('Failed to get playlist', { error });
      res.status(500).json({ 
        error: 'Failed to get playlist',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new StreamingController();
