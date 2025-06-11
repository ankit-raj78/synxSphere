import express, { Application, Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createLogger } from './utils/logger';

const logger = createLogger('MockUserService');

export default class MockUserService {
  private app: Application;
  private users = new Map<string, any>();
  private sessions = new Map<string, any>();

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
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  private registerUser: RequestHandler = (req, res) => {
    try {
      const { email, username, password } = req.body;
      if (!email || !username || !password) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }
      const exists = Array.from(this.users.values()).find(
        (u: any) => u.email === email || u.username === username
      );
      if (exists) {
        res.status(409).json({ error: 'User already exists' });
        return;
      }
      const userId = `user_${Date.now()}`;
      const newUser = {
        id: userId,
        email,
        username,
        profile: { role: 'user', musicalPreferences: {}, bio: '', avatar: '' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.users.set(userId, newUser);
      logger.info('User registered successfully', { userId, email, username });
      res.status(201).json({
        message: 'User registered successfully',
        user: { id: userId, email, username, profile: newUser.profile }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  private loginUser: RequestHandler = (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Missing email or password' });
        return;
      }
      const user = Array.from(this.users.values()).find(
        (u: any) => u.email === email
      );
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      const sessionId = `session_${Date.now()}`;
      const session = {
        id: sessionId,
        userId: user.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      };
      this.sessions.set(sessionId, session);
      logger.info('User logged in successfully', { userId: user.id, sessionId });
      res.json({
        message: 'Login successful',
        token: `mock_jwt_${sessionId}`,
        refreshToken: `mock_refresh_${sessionId}`,
        user: { id: user.id, email: user.email, username: user.username, profile: user.profile }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  private getProfile: RequestHandler = (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }
      const sessionId = auth.replace('Bearer ', '').replace('mock_jwt_', '');
      const session = this.sessions.get(sessionId);
      if (!session) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
      const user = this.users.get(session.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json({ user: { id: user.id, email: user.email, username: user.username, profile: user.profile } });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  private updateProfile: RequestHandler = (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }
      const sessionId = auth.replace('Bearer ', '').replace('mock_jwt_', '');
      const session = this.sessions.get(sessionId);
      if (!session) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
      const user = this.users.get(session.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      const { bio, avatar, musicalPreferences } = req.body;
      if (bio !== undefined) user.profile.bio = bio;
      if (avatar !== undefined) user.profile.avatar = avatar;
      if (musicalPreferences !== undefined) {
        user.profile.musicalPreferences = { ...user.profile.musicalPreferences, ...musicalPreferences };
      }
      user.updated_at = new Date().toISOString();
      this.users.set(user.id, user);
      logger.info('Profile updated successfully', { userId: user.id });
      res.json({ message: 'Profile updated successfully', user: { id: user.id, email: user.email, username: user.username, profile: user.profile } });
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  private listUsers: RequestHandler = (_req, res) => {
    try {
      const list = Array.from(this.users.values()).map((u: any) => ({ id: u.id, email: u.email, username: u.username, profile: u.profile, created_at: u.created_at }));
      res.json({ users: list, pagination: { page: 1, limit: 10, total: list.length, totalPages: 1 } });
    } catch (error) {
      logger.error('Get users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  private setupRoutes(): void {
    this.app.get('/health', (_req: Request, res: Response): void => {
      res.json({
        service: 'mock-user-service',
        version: '1.0.0',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        users: this.users.size,
        sessions: this.sessions.size
      });
    });

    this.app.post('/api/auth/register', this.registerUser);
    this.app.post('/api/auth/login', this.loginUser);
    this.app.get('/api/profile/me', this.getProfile);
    this.app.put('/api/profile/me', this.updateProfile);
    this.app.get('/api/users', this.listUsers);

    this.app.use('*', (_req: Request, res: Response): void => {
      res.status(404).json({ error: 'Route not found', path: _req.originalUrl });
    });
  }

  private setupErrorHandling(): void {
    this.app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  public start(port: number = 3001): void {
    this.app.listen(port, () => {
      logger.info(`Mock User Service started on port ${port}`);
      console.log(`🚀 Mock User Service is running on http://localhost:${port}`);
    });
    process.on('SIGINT', this.shutdown.bind(this));
    process.on('SIGTERM', this.shutdown.bind(this));
  }

  private shutdown(): void {
    logger.info('Shutting down mock user service...');
    process.exit(0);
  }
}

// To start the service:
// const service = new MockUserService();
// service.start();
