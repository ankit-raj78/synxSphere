import express, { Request, RequestHandler, Response } from 'express';
import { body } from 'express-validator';
import AuthController from '../controllers/AuthController';
import { verifyToken } from '../middleware/authWrapper';

const router = express.Router();

// Login
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
  ],
  AuthController.login as RequestHandler
);

// Register
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('username').isLength({ min: 3, max: 30 }).trim(),
    body('password').isLength({ min: 6 }),
    body('profile.musicalPreferences.genres').optional().isArray(),
    body('profile.musicalPreferences.instruments').optional().isArray(),
    body('profile.musicalPreferences.experience').optional().isIn(['beginner', 'intermediate', 'advanced', 'professional'])
  ],
  AuthController.register as RequestHandler
);

// Refresh token
router.post('/refresh',
  verifyToken,
  AuthController.refreshToken as RequestHandler
);

// Logout
router.post('/logout',
  verifyToken,
  AuthController.logout as RequestHandler
);

// Logout from all devices
router.post('/logout-all',
  verifyToken,
  AuthController.logoutAll as RequestHandler
);

// Verify token (for other services)
router.get('/verify',
  verifyToken,
  (req: Request, res: Response) => {
    res.json({
      valid: true,
      user: {
        id: req.user?.id,
        email: req.user?.email,
        username: req.user?.username,
        profile: req.user?.profile
      }
    });
  }
);

// Password reset request
router.post('/forgot-password',
  [
    body('email').isEmail().normalizeEmail()
  ],
  AuthController.forgotPassword
);

// Password reset
router.post('/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 6 })
  ],
  AuthController.resetPassword
);

export default router;
