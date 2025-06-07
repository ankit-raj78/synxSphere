import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import DatabaseManager from '../../shared/config/database';
import { createLogger } from './utils/logger';
import uploadRoutes from './routes/uploadRoutes';
import processingRoutes from './routes/processingRoutes';
import streamingRoutes from './routes/streamingRoutes';
import analysisRoutes from './routes/analysisRoutes';
import { errorHandler } from './middleware/errorHandler';
import { ServiceConfig } from '../../shared/types';

// Load environment variables
dotenv.config();

const logger = createLogger('AudioService');

class AudioService {
  private app: express.Application;
  private config: ServiceConfig;

  constructor() {
    this.app = express();
    this.config = this.loadConfig();
    this.setupDirectories();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private loadConfig(): ServiceConfig {
    return {
      port: parseInt(process.env.AUDIO_SERVICE_PORT || '3002'),
      name: 'audio-service',
      version: '1.0.0',
      environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
      corsOrigin: process.env.CORS_ORIGIN || '*',
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      database: {
        postgres: {
          host: process.env.POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.POSTGRES_PORT || '5432'),
          database: process.env.POSTGRES_DB || 'syncsphere',
          user: process.env.POSTGRES_USER || 'postgres',
          password: process.env.POSTGRES_PASSWORD || 'password',
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
        mongodb: {
          uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
          database: process.env.MONGODB_DB || 'syncsphere'
        },
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD
        },
        kafka: {
          brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
          clientId: 'audio-service'
        }
      }
    };
  }

  private setupDirectories(): void {
    const directories = [
      'uploads',
      'uploads/audio',
      'uploads/temp',
      'processed',
      'processed/audio',
      'logs'
    ];

    directories.forEach(dir => {
      const dirPath = path.resolve(dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logger.info(`Created directory: ${dirPath}`);
      }
    });
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS
    this.app.use(cors({
      origin: this.config.corsOrigin,
      credentials: true
    }));

    // Compression
    this.app.use(compression());

    // Rate limiting - more restrictive for file uploads
    const uploadLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // limit each IP to 10 uploads per windowMs
      message: 'Too many upload requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });

    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    });

    this.app.use('/api/upload', uploadLimiter);
    this.app.use(generalLimiter);

    // Body parsing - larger limit for audio metadata
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentLength: req.get('Content-Length')
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        service: this.config.name,
        version: this.config.version,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // API routes
    this.app.use('/api/upload', uploadRoutes);
    this.app.use('/api/processing', processingRoutes);
    this.app.use('/api/stream', streamingRoutes);
    this.app.use('/api/analysis', analysisRoutes);

    // Static file serving for processed audio
    this.app.use('/files', express.static(path.resolve('processed')));

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Initialize database connections
      await DatabaseManager.initialize();
      logger.info('Database connections established');

      // Start server
      this.app.listen(this.config.port, () => {
        logger.info(`${this.config.name} started on port ${this.config.port}`, {
          environment: this.config.environment,
          version: this.config.version
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', this.shutdown.bind(this));
      process.on('SIGINT', this.shutdown.bind(this));

    } catch (error) {
      logger.error('Failed to start audio service:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down audio service...');
    
    try {
      await DatabaseManager.close();
      logger.info('Database connections closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the service
const audioService = new AudioService();
audioService.start();

export default AudioService;
