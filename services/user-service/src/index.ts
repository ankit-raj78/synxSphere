import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import DatabaseManager from '../../shared/config/database';
import { createLogger } from './utils/logger';
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import { errorHandler } from './middleware/errorHandler';
import { ServiceConfig } from '../../shared/types';

// Load environment variables
dotenv.config();

const logger = createLogger('UserService');

class UserService {
  private app: express.Application;
  private config: ServiceConfig;

  constructor() {
    this.app = express();
    this.config = this.loadConfig();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }
  private loadConfig(): ServiceConfig {
    return {
      port: parseInt(process.env.USER_SERVICE_PORT || '3001'),
      name: 'user-service',
      version: '1.0.0',
      environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
      corsOrigin: process.env.CORS_ORIGIN || '*',
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      requestLimit: '10mb', // Match the express.json limit
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // 100 requests per windowMs
      },
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
          clientId: 'user-service'
        }
      }
    };
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

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
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
        timestamp: new Date().toISOString()
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/profile', profileRoutes);

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
      logger.error('Failed to start user service:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down user service...');
    
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
const userService = new UserService();
userService.start();

export default UserService;
