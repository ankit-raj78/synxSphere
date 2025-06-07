import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createLogger } from './utils/logger';

// Mock user service without database dependencies
const logger = createLogger('MockUserService');

class MockUserService {
  private app: express.Application;
  private users: Map<string, any> = new Map();
  private sessions: Map<string, any> = new Map();

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    
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
        service: 'mock-user-service',
        version: '1.0.0',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        users: this.users.size,
        sessions: this.sessions.size
      });
    });

    // Register user
    this.app.post('/api/auth/register', (req, res) => {
      try {
        const { email, username, password } = req.body;
        
        if (!email || !username || !password) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if user already exists
        const existingUser = Array.from(this.users.values()).find(
          u => u.email === email || u.username === username
        );

        if (existingUser) {
          return res.status(409).json({ error: 'User already exists' });
        }

        // Create new user
        const userId = `user_${Date.now()}`;
        const user = {
          id: userId,
          email,
          username,
          profile: {
            role: 'user',
            musicalPreferences: {},
            bio: '',
            avatar: ''
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        this.users.set(userId, user);

        logger.info('User registered successfully', { userId, email, username });

        return res.status(201).json({
          message: 'User registered successfully',
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            profile: user.profile
          }
        });
      } catch (error) {
        logger.error('Registration error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Login user
    this.app.post('/api/auth/login', (req, res) => {
      try {
        const { email, password } = req.body;
        
        if (!email || !password) {
          return res.status(400).json({ error: 'Missing email or password' });
        }

        // Find user
        const user = Array.from(this.users.values()).find(u => u.email === email);
        
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // In a real app, we'd verify the password hash
        // For this mock, we'll accept any password

        // Create session
        const sessionId = `session_${Date.now()}`;
        const session = {
          id: sessionId,
          userId: user.id,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };

        this.sessions.set(sessionId, session);

        logger.info('User logged in successfully', { userId: user.id, sessionId });

        return res.json({
          message: 'Login successful',
          token: `mock_jwt_${sessionId}`,
          refreshToken: `mock_refresh_${sessionId}`,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            profile: user.profile
          }
        });
      } catch (error) {
        logger.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get current user profile (requires mock authentication)
    this.app.get('/api/profile/me', (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const sessionId = token.replace('mock_jwt_', '');
        const session = this.sessions.get(sessionId);

        if (!session) {
          return res.status(401).json({ error: 'Invalid token' });
        }

        const user = this.users.get(session.userId);
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        return res.json({
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            profile: user.profile
          }
        });
      } catch (error) {
        logger.error('Get profile error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Update user profile
    this.app.put('/api/profile/me', (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const sessionId = token.replace('mock_jwt_', '');
        const session = this.sessions.get(sessionId);

        if (!session) {
          return res.status(401).json({ error: 'Invalid token' });
        }

        const user = this.users.get(session.userId);
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Update profile
        const { bio, avatar, musicalPreferences } = req.body;
        
        if (bio !== undefined) user.profile.bio = bio;
        if (avatar !== undefined) user.profile.avatar = avatar;
        if (musicalPreferences !== undefined) {
          user.profile.musicalPreferences = { ...user.profile.musicalPreferences, ...musicalPreferences };
        }
        
        user.updated_at = new Date().toISOString();
        this.users.set(user.id, user);

        logger.info('Profile updated successfully', { userId: user.id });

        return res.json({
          message: 'Profile updated successfully',
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            profile: user.profile
          }
        });
      } catch (error) {
        logger.error('Update profile error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get all users (admin-like endpoint for testing)
    this.app.get('/api/users', (req, res) => {
      try {
        const users = Array.from(this.users.values()).map(user => ({
          id: user.id,
          email: user.email,
          username: user.username,
          profile: user.profile,
          created_at: user.created_at
        }));

        return res.json({
          users,
          pagination: {
            page: 1,
            limit: 10,
            total: users.length,
            totalPages: 1
          }
        });
      } catch (error) {
        logger.error('Get users error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use((error: any, req: any, res: any, next: any) => {
      logger.error('Unhandled error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  public start(port: number = 3001): void {
    this.app.listen(port, () => {
      logger.info(`Mock User Service started on port ${port}`, {
        environment: 'mock',
        version: '1.0.0'
      });
      
      console.log(`\n🚀 Mock User Service is running!`);
      console.log(`📍 Server: http://localhost:${port}`);
      console.log(`💊 Health Check: http://localhost:${port}/health`);
      console.log(`\n📖 Available Endpoints:`);
      console.log(`   POST /api/auth/register - Register a new user`);
      console.log(`   POST /api/auth/login - Login user`);
      console.log(`   GET  /api/profile/me - Get current user profile`);
      console.log(`   PUT  /api/profile/me - Update current user profile`);
      console.log(`   GET  /api/users - Get all users`);
      console.log(`   GET  /health - Service health check`);
      console.log(`\n💡 Example requests:`);
      console.log(`   curl -X POST http://localhost:${port}/api/auth/register \\`);
      console.log(`     -H "Content-Type: application/json" \\`);
      console.log(`     -d '{"email":"test@example.com","username":"testuser","password":"password123"}'`);
      console.log(`\n   curl -X POST http://localhost:${port}/api/auth/login \\`);
      console.log(`     -H "Content-Type: application/json" \\`);
      console.log(`     -d '{"email":"test@example.com","password":"password123"}'`);
    });

    // Graceful shutdown
    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGINT', this.shutdown.bind(this));
  }

  private shutdown(): void {
    logger.info('Shutting down mock user service...');
    process.exit(0);
  }
}

// Start the mock service
const mockService = new MockUserService();
mockService.start();

export default MockUserService;
