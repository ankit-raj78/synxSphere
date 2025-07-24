import { Router } from 'express';
import { Container } from 'inversify';
import { AuthController } from '../controllers/AuthController';
import { UserController } from '../controllers/UserController';
import { RoomController } from '../controllers/RoomController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { TYPES } from '../../../infrastructure/container/types';

/**
 * Router factory for clean architecture routes
 * Demonstrates how controllers handle only HTTP concerns
 */
export class RouteFactory {
  private router: Router;
  private container: Container;

  constructor(container: Container) {
    this.router = Router();
    this.container = container;
    this.setupRoutes();
  }

  /**
   * Get configured router
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Setup all application routes
   */
  private setupRoutes(): void {
    this.setupAuthRoutes();
    this.setupUserRoutes();
    this.setupRoomRoutes();
    this.setupErrorHandling();
  }

  /**
   * Authentication routes
   */
  private setupAuthRoutes(): void {
    const authController = this.container.get<AuthController>(TYPES.AuthController);

    // Public authentication routes
    this.router.post('/auth/register', authController.register);
    this.router.post('/auth/login', authController.login);
    this.router.post('/auth/refresh', authController.refreshToken);
    
    // Protected authentication routes
    this.router.post('/auth/logout', AuthMiddleware.authenticate, authController.logout);
  }

  /**
   * User management routes
   */
  private setupUserRoutes(): void {
    const userController = this.container.get<UserController>(TYPES.UserController);

    // Public user routes
    this.router.get('/users/:id/public', userController.getPublicProfile);
    this.router.get('/users/search', AuthMiddleware.optionalAuthenticate, userController.searchUsers);

    // Protected user routes
    this.router.get('/users/me', AuthMiddleware.authenticate, userController.getCurrentUser);
    this.router.put('/users/me', AuthMiddleware.authenticate, userController.updateCurrentUser);
    
    // Admin user routes
    this.router.get('/users/:id', AuthMiddleware.authenticate, userController.getUser);
    this.router.put('/users/:id', AuthMiddleware.authenticate, userController.updateUser);
  }

  /**
   * Room management routes
   */
  private setupRoomRoutes(): void {
    const roomController = this.container.get<RoomController>(TYPES.RoomController);

    // Public room routes (with optional auth for personalization)
    this.router.get('/rooms', AuthMiddleware.optionalAuthenticate, roomController.getRooms);
    this.router.get('/rooms/:id', AuthMiddleware.optionalAuthenticate, roomController.getRoom);
    this.router.get('/rooms/:id/participants', AuthMiddleware.optionalAuthenticate, roomController.getRoomParticipants);

    // Protected room routes
    this.router.post('/rooms', AuthMiddleware.authenticate, roomController.createRoom);
    this.router.post('/rooms/:id/join', AuthMiddleware.authenticate, roomController.joinRoom);
    this.router.delete('/rooms/:id/leave', AuthMiddleware.authenticate, roomController.leaveRoom);
    this.router.put('/rooms/:id', AuthMiddleware.authenticate, roomController.updateRoom);
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler for undefined routes
    this.router.use('*', ErrorHandler.notFound);
    
    // Global error handler
    this.router.use(ErrorHandler.handle);
  }
}

/**
 * Example Express app setup with clean architecture
 */
export function createApp(container: Container) {
  const express = require('express');
  const cors = require('cors');
  const helmet = require('helmet');
  const rateLimit = require('express-rate-limit');

  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.'
      }
    }
  });
  app.use('/api', limiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req: any, res: any) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0'
    });
  });

  // API routes
  const routeFactory = new RouteFactory(container);
  app.use('/api/v1', routeFactory.getRouter());

  return app;
}

/**
 * Example usage with WebSocket integration:
 * 
 * ```typescript
 * import { createServer } from 'http';
 * import { createApp } from './routes/RouteFactory';
 * import { WebSocketServer } from '../infrastructure/websocket/WebSocketServer';
 * import { container } from '../infrastructure/container/Container';
 * 
 * const app = createApp(container);
 * const server = createServer(app);
 * 
 * // Initialize WebSocket server with event-driven architecture
 * const wsServer = container.get<WebSocketServer>('WebSocketServer');
 * const authService = container.get('TokenService');
 * wsServer.initialize(server, authService);
 * 
 * const PORT = process.env.PORT || 3000;
 * server.listen(PORT, () => {
 *   console.log(`Server running on port ${PORT}`);
 *   console.log(`WebSocket ready for real-time communication`);
 * });
 * ```
 * 
 * Features enabled:
 * - Real-time room updates via WebSocket
 * - Event-driven architecture with domain events
 * - Synchronized audio playback across clients
 * - Clean separation between HTTP and WebSocket concerns
 */
