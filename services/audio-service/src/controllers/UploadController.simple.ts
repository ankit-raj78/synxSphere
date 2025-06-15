import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
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
   * Simple placeholder for multiple file upload
   */
  async uploadMultiple(req: Request, res: Response): Promise<void> {
    res.status(501).json({ 
      error: 'Multiple file upload not implemented in simplified version' 
    });
  }

  /**
   * Simple placeholder for progress tracking
   */
  async getUploadProgress(req: Request, res: Response): Promise<void> {
    res.status(501).json({ 
      error: 'Upload progress tracking not implemented in simplified version' 
    });
  }

  /**
   * Simple placeholder for file deletion
   */
  async deleteFile(req: Request, res: Response): Promise<void> {
    res.status(501).json({ 
      error: 'File deletion not implemented in simplified version' 
    });
  }
}

export default new UploadController();
