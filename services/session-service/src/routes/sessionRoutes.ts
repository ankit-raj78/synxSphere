import { Router } from 'express';
import sessionController from '../controllers/SessionController';
import { authWrapper } from '../middleware/authWrapper';

const router = Router();

// All session routes require authentication
router.use(authWrapper);

// Import types from the controller
import { AuthenticatedRequest } from '../controllers/SessionController';
import { Response, Request, RequestHandler } from 'express';

// Session management
router.post('/create', (sessionController.createSession as RequestHandler));
router.get('/:sessionId', (sessionController.getSession as RequestHandler));
router.put('/:sessionId', (sessionController.updateSession as RequestHandler));
router.delete('/:sessionId', (sessionController.deleteSession as RequestHandler));

// Session participants
router.post('/:sessionId/join', (sessionController.joinSession as RequestHandler));
router.post('/:sessionId/leave', (sessionController.leaveSession as RequestHandler));
router.get('/:sessionId/participants', (sessionController.getSessionParticipants as RequestHandler));

// Session state
router.put('/:sessionId/state', (sessionController.updateSessionState as RequestHandler));
router.get('/:sessionId/state', (sessionController.getSessionState as RequestHandler));

// Session history
router.get('/user/:userId/history', (sessionController.getUserSessionHistory as RequestHandler));

export default router;
