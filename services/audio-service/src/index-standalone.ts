import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createLogger } from './utils/logger';
import uploadRoutes from './routes/uploadRoutes';
import processingRoutes from './routes/processingRoutes';
import streamingRoutes from './routes/streamingRoutes';
import analysisRoutes from './routes/analysisRoutes';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const logger = createLogger('AudioService-Standalone');

class AudioServiceStandalone {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.AUDIO_SERVICE_PORT || '3002');
    this.setupDirectories();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupDirectories(): void {
    const dirs = [
      path.join(__dirname, '../uploads/audio'),
      path.join(__dirname, '../uploads/temp'),
      path.join(__dirname, '../processed/audio'),
      path.join(__dirname, '../logs')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      }
    });
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true
    }));

    // Security
    this.app.use(helmet());
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'audio-service',
        mode: 'standalone',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Simple auth middleware for standalone testing
    const mockAuth = (req: any, res: any, next: any) => {
      // Mock user for testing
      req.user = {
        id: 'test-user-' + Math.random().toString(36).substr(2, 9),
        username: 'test-user',
        email: 'test@example.com'
      };
      next();
    };

    // Apply mock auth to all API routes
    this.app.use('/api', mockAuth);

    // API routes
    this.app.use('/api/upload', uploadRoutes);
    this.app.use('/api/process', processingRoutes);
    this.app.use('/api/stream', streamingRoutes);
    this.app.use('/api/analysis', analysisRoutes);

    // Test route for combining audio files
    this.app.post('/api/test/combine', async (req, res) => {
      try {
        const { files, outputName } = req.body;
        
        if (!files || !Array.isArray(files) || files.length === 0) {
          return res.status(400).json({ error: 'Files array is required' });
        }

        // Mock file IDs for testing with actual files
        const mockFiles = files.map((fileName: string, index: number) => ({
          id: `mock-${index}`,
          filename: fileName,
          filePath: path.join(process.cwd(), fileName),
          originalName: fileName
        }));

        res.json({
          message: 'Audio combination test endpoint',
          files: mockFiles,
          outputName: outputName || 'combined-output.wav',
          status: 'ready-for-processing'
        });

      } catch (error) {
        logger.error('Test combine error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Skip database initialization for standalone mode
      logger.info('Starting in standalone mode (no database connections)');

      this.app.listen(this.port, () => {
        logger.info(`🎵 Audio Service (Standalone) running on port ${this.port}`);
        logger.info(`📁 Upload directory: ${path.join(__dirname, '../uploads/audio')}`);
        logger.info(`🔄 Processing directory: ${path.join(__dirname, '../processed/audio')}`);
        logger.info(`🌐 Health check: http://localhost:${this.port}/api/health`);
      });

    } catch (error) {
      logger.error('Failed to start Audio Service:', error);
      process.exit(1);
    }
  }
}

// Start the service
const service = new AudioServiceStandalone();
service.start().catch(console.error);

export default AudioServiceStandalone;
