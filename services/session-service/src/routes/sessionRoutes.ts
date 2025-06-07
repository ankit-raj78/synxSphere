import { Router } from 'express';
import SessionController from '../controllers/SessionController';
import { authWrapper } from '../middleware/authWrapper';

const router = Router();

// All session routes require authentication
router.use(authWrapper);

// Session management
router.post('/create', SessionController.createSession);
router.get('/:sessionId', SessionController.getSession);
router.put('/:sessionId', SessionController.updateSession);
router.delete('/:sessionId', SessionController.deleteSession);

// Session participants
router.post('/:sessionId/join', SessionController.joinSession);
router.post('/:sessionId/leave', SessionController.leaveSession);
router.get('/:sessionId/participants', SessionController.getSessionParticipants);

// Session state
router.put('/:sessionId/state', SessionController.updateSessionState);
router.get('/:sessionId/state', SessionController.getSessionState);

// Session history
router.get('/user/:userId/history', SessionController.getUserSessionHistory);

export default router;
