import express, { Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import ProfileController from '../controllers/ProfileController';
import { verifyToken } from '../middleware/authWrapper';

const router = express.Router();

// Get current user's profile
router.get('/me',
  verifyToken,
  (req: Request, res: Response, next: NextFunction) => ProfileController.getMyProfile(req, res, next)
);

// Update current user's profile
router.put('/me',
  verifyToken,
  [
    body('bio').optional().isString().isLength({ max: 500 }),
    body('avatar').optional().isURL(),
    body('musicalPreferences.genres').optional().isArray(),
    body('musicalPreferences.instruments').optional().isArray(),
    body('musicalPreferences.experience').optional().isIn(['beginner', 'intermediate', 'advanced', 'professional']),
    body('musicalPreferences.collaborationStyle').optional().isIn(['leader', 'follower', 'flexible']),
    body('musicalPreferences.preferredTempo.min').optional().isInt({ min: 60, max: 200 }),
    body('musicalPreferences.preferredTempo.max').optional().isInt({ min: 60, max: 200 }),
    body('musicalPreferences.preferredKeys').optional().isArray()
  ],
  (req: Request, res: Response, next: NextFunction) => ProfileController.updateMyProfile(req, res, next)
);

// Update musical preferences
router.put('/me/preferences',
  verifyToken,
  [
    body('genres').optional().isArray(),
    body('instruments').optional().isArray(),
    body('experience').optional().isIn(['beginner', 'intermediate', 'advanced', 'professional']),
    body('collaborationStyle').optional().isIn(['leader', 'follower', 'flexible']),
    body('preferredTempo.min').optional().isInt({ min: 60, max: 200 }),
    body('preferredTempo.max').optional().isInt({ min: 60, max: 200 }),
    body('preferredKeys').optional().isArray()
  ],
  (req: Request, res: Response, next: NextFunction) => ProfileController.updateMusicalPreferences(req, res, next)
);

// Get profile compatibility with another user
router.get('/compatibility/:userId',
  verifyToken,
  [
    param('userId').isUUID()
  ],
  (req: Request, res: Response, next: NextFunction) => ProfileController.getCompatibility(req, res, next)
);

export default router;