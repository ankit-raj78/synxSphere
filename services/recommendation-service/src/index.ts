import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
// import DatabaseManager from '../../shared/config/database';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
// import { ServiceConfig } from '../../shared/types';
// import { MLRecommendationEngine } from './services/MLRecommendationEngine';

// Load environment variables
dotenv.config();

class RecommendationService {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.RECOMMENDATION_SERVICE_PORT || '3004');
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
    });
    this.app.use(limiter);

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'recommendation-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
    });

    // Basic recommendation endpoints
    this.app.post('/api/recommendations/users', async (req, res) => {
      try {
        const { userId, preferences } = req.body;
        
        if (!userId) {
          return res.status(400).json({ error: 'User ID is required' });
        }

        // For now, return a basic response until we implement full functionality
        res.json({
          userId,
          recommendations: [],
          message: 'Recommendation engine is operational'
        });
      } catch (error) {
        logger.error('Error in user recommendations:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.post('/api/recommendations/collaborators', async (req, res) => {
      try {
        const { userId, projectType } = req.body;
        
        if (!userId) {
          return res.status(400).json({ error: 'User ID is required' });
        }

        // For now, return a basic response until we implement full functionality
        res.json({
          userId,
          collaborators: [],
          message: 'Collaborator recommendation engine is operational'
        });
      } catch (error) {
        logger.error('Error in collaborator recommendations:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Skip database initialization for now - using placeholders
      logger.info('Recommendation service starting (using placeholders)');

      // Start the server
      const server = this.app.listen(this.port, () => {
        logger.info('recommendation-service started successfully', {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          version: '1.0.0',
        });
      });

      // Graceful shutdown handling
      const gracefulShutdown = async (signal: string) => {
        logger.info(`Received ${signal}, shutting down gracefully`);
        
        server.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });

        // Force close after 10 seconds
        setTimeout(() => {
          logger.error('Forcing shutdown after timeout');
          process.exit(1);
        }, 10000);
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
      logger.error('Failed to start service:', error);
      process.exit(1);
    }
  }
}

// Start the service
const service = new RecommendationService();
service.start().catch((error) => {
  console.error('Failed to start RecommendationService:', error);
  process.exit(1);
});

export default RecommendationService;
