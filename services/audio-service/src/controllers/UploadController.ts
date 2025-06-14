import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import DatabaseManager from '../../../shared/config/database';
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

          // Create audio file record
          const audioFileData: Partial<AudioFile> = {
            id: uuidv4(),
            user_id: userId,
            filename: file.filename,
            original_name: file.originalname,
            file_path: file.path,
            file_size: file.size,
            mime_type: file.mimetype,
            duration: analysis.duration,
            sample_rate: analysis.sample_rate,
            channels: analysis.channels,
            bit_rate: analysis.bit_rate,
            format: analysis.format,
            is_processed: false,
            created_at: new Date(),
            updated_at: new Date()
          };

          const query = `
            INSERT INTO audio_files (
              id, user_id, filename, original_name, file_path, file_size, 
              mime_type, duration, sample_rate, channels, bit_rate, format, 
              is_processed, created_at, updated_at
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
          `;

          const values = [
            audioFileData.id,
            audioFileData.user_id,
            audioFileData.filename,
            audioFileData.original_name,
            audioFileData.file_path,
            audioFileData.file_size,
            audioFileData.mime_type,
            audioFileData.duration,
            audioFileData.sample_rate,
            audioFileData.channels,
            audioFileData.bit_rate,
            audioFileData.format,
            audioFileData.is_processed,
            audioFileData.created_at,
            audioFileData.updated_at
          ];

          const result = await DatabaseManager.executeQuery<AudioFile>(query, values);
          const audioFile = result.rows[0];
          uploadedFiles.push(audioFile);

          // Store analysis
          analysis.id = uuidv4();
          analysis.file_id = audioFile.id;

          const analysisQuery = `
            INSERT INTO audio_analysis (
              id, file_id, duration, sample_rate, channels, bit_rate, 
              codec, format, size, analyzed_at, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `;

          const analysisValues = [
            analysis.id,
            analysis.file_id,
            analysis.duration,
            analysis.sample_rate,
            analysis.channels,
            analysis.bit_rate,
            analysis.codec,
            analysis.format,
            analysis.size,
            analysis.analyzed_at,
            analysis.created_at,
            analysis.updated_at
          ];

          await DatabaseManager.executeQuery(analysisQuery, analysisValues);
          analyses.push(analysis);

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

      // Get file info
      const fileQuery = 'SELECT * FROM audio_files WHERE id = $1 AND user_id = $2';
      const fileResult = await DatabaseManager.executeQuery<AudioFile>(fileQuery, [fileId, userId]);

      if (fileResult.rows.length === 0) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const audioFile = fileResult.rows[0];

      // Delete physical file
      const filePath = audioFile.file_path || audioFile.filepath;
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

      // Delete from database
      await DatabaseManager.executeQuery(
        'DELETE FROM audio_analysis WHERE file_id = $1', 
        [fileId]
      );
      
      await DatabaseManager.executeQuery(
        'DELETE FROM audio_files WHERE id = $1', 
        [fileId]
      );

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
