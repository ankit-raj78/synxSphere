import express, { Request, Response, NextFunction } from 'express';
const { body, param, query } = require('express-validator');
import UserController from '../controllers/UserController';
import { verifyToken, requireRole } from '../middleware/authWrapper';

const router = express.Router();

// Get all users (with pagination and search)
router.get('/',
  verifyToken,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString().trim(),
    query('role').optional().isIn(['user', 'admin', 'moderator'])
  ],
  (req: Request, res: Response, next: NextFunction) => UserController.getUsers(req, res, next)
);

// Get user by ID
router.get('/:id',
  verifyToken,
  [
    param('id').isUUID()
  ],
  (req: Request, res: Response, next: NextFunction) => UserController.getUserById(req, res, next)
);

// Update user
router.put('/:id',
  verifyToken,
  [
    param('id').isUUID(),
    body('email').optional().isEmail().normalizeEmail(),
    body('username').optional().isLength({ min: 3, max: 30 }).trim(),
    body('profile').optional().isObject()
  ],
  (req: Request, res: Response, next: NextFunction) => UserController.updateUser(req, res, next)
);

// Delete user
router.delete('/:id',
  verifyToken,
  requireRole(['admin']),
  [
    param('id').isUUID()
  ],
  (req: Request, res: Response, next: NextFunction) => UserController.deleteUser(req, res, next)
);

// Get user's sessions
router.get('/:id/sessions',
  verifyToken,
  [
    param('id').isUUID()
  ],
  (req: Request, res: Response, next: NextFunction) => UserController.getUserSessions(req, res, next)
);

// Search users by musical preferences
router.post('/search',
  verifyToken,
  [
    body('genres').optional().isArray(),
    body('instruments').optional().isArray(),
    body('experience').optional().isIn(['beginner', 'intermediate', 'advanced', 'professional']),
    body('collaborationStyle').optional().isIn(['leader', 'follower', 'flexible'])
  ],
  (req: Request, res: Response, next: NextFunction) => UserController.searchUsersByPreferences(req, res, next)
);

export default router;