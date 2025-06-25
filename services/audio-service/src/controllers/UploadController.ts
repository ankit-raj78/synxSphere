import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../../lib/prisma';
import { AudioFile } from '../../../shared/types';
import { createLogger } from '../utils/logger';
import AudioProcessor from '../services/AudioProcessor';

const logger = createLogger('UploadController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const uploadDir = path.resolve('uploads/audio');
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /\.(mp3|wav|flac|aac|m4a|ogg|wma)$/i;
  const isValidType = allowedTypes.test(file.originalname);
  
  if (isValidType) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only audio files are allowed.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 10 // Maximum 10 files per upload
  }
});

export class UploadController {
  /**
   * Upload and process single audio file (without database storage)
   */
  async uploadSingle(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      const userId = (req as any).user?.id;

      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      logger.info('Processing single file upload', { 
        filename: file.filename,
        originalName: file.originalname,
        userId 
      });

      // Analyze the uploaded file
      const analysis = await AudioProcessor.analyzeAudio(file.path);

      // Return the analysis results without storing in database
      res.status(200).json({
        success: true,
        message: 'Audio file processed successfully',
        file: {
          id: uuidv4(),
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          duration: analysis.duration,
          sampleRate: analysis.sample_rate,
          channels: analysis.channels,
          bitRate: analysis.bit_rate,
          format: analysis.format,
          uploadedAt: new Date().toISOString()
        },
        analysis
      });

    } catch (error) {
      logger.error('Error uploading single file:', error);
      res.status(500).json({ 
        error: 'Failed to process audio file',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Upload multiple audio files
   */
  async uploadMultiple(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      const userId = (req as any).user?.id;

      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files uploaded' });
        return;
      }

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      logger.info('Processing multiple file upload', { 
        fileCount: files.length,
        userId 
      });

      const uploadedFiles: AudioFile[] = [];
      const analyses: any[] = [];

      for (const file of files) {
        try {
          // Analyze the uploaded file
          const analysis = await AudioProcessor.analyzeAudio(file.path);

          // Create audio file record using Prisma
          const audioFile = await prisma.audioFile.create({
            data: {
              id: uuidv4(),
              userId: userId,
              filename: file.filename,
              originalName: file.originalname,
              filePath: file.path,
              fileSize: file.size,
              mimeType: file.mimetype,
              duration: analysis.duration,
              sampleRate: analysis.sample_rate,
              channels: analysis.channels,
              bitRate: analysis.bit_rate,
              format: analysis.format,
              isProcessed: false
            }
          });

          uploadedFiles.push(audioFile as any);

          // Store analysis using Prisma
          const analysisRecord = await prisma.audioAnalysis.create({
            data: {
              id: uuidv4(),
              fileId: audioFile.id,
              duration: analysis.duration,
              sampleRate: analysis.sample_rate,
              channels: analysis.channels,
              bitRate: analysis.bit_rate,
              codec: analysis.codec,
              format: analysis.format,
              size: analysis.size,
              analyzedAt: analysis.analyzed_at,
              createdAt: analysis.created_at,
              updatedAt: analysis.updated_at
            }
          });

          analyses.push(analysisRecord);

        } catch (fileError) {
          logger.error('Failed to process individual file', { 
            filename: file.filename, 
            error: fileError 
          });
          // Continue with other files
        }
      }

      logger.info('Multiple file upload completed', { 
        uploadedCount: uploadedFiles.length,
        totalFiles: files.length,
        userId 
      });

      res.status(201).json({
        message: `${uploadedFiles.length} of ${files.length} files uploaded successfully`,
        files: uploadedFiles,
        analyses
      });

    } catch (error) {
      logger.error('Multiple file upload failed', { error });
      res.status(500).json({ 
        error: 'Multiple file upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get upload progress (for large files)
   */
  async getUploadProgress(req: Request, res: Response): Promise<void> {
    try {
      const uploadId = req.params.uploadId;
      
      // This would typically integrate with a Redis-based progress tracking system
      // For now, we'll return a simple response
      
      res.json({
        uploadId,
        status: 'completed',
        progress: 100,
        message: 'Upload completed successfully'
      });

    } catch (error) {
      logger.error('Failed to get upload progress', { error });
      res.status(500).json({ 
        error: 'Failed to get upload progress',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(req: Request, res: Response): Promise<void> {
    try {
      const fileId = req.params.fileId;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Get file info using Prisma
      const audioFile = await prisma.audioFile.findFirst({
        where: {
          id: fileId,
          userId: userId
        }
      });

      if (!audioFile) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      // Delete physical file
      const filePath = audioFile.filePath;
      if (filePath) {
        try {
          await fs.unlink(filePath);
        } catch (fsError) {
          logger.warn('Failed to delete physical file', { 
            filePath, 
            error: fsError 
          });
        }
      }

      // Delete from database using Prisma (analysis will be deleted due to cascade)
      await prisma.audioFile.delete({
        where: { id: fileId }
      });

      logger.info('File deleted successfully', { fileId, userId });

      res.json({ message: 'File deleted successfully' });

    } catch (error) {
      logger.error('File deletion failed', { error });
      res.status(500).json({ 
        error: 'File deletion failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new UploadController();
