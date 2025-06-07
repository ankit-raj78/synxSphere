import { Router } from 'express';
import RoomController from '../controllers/RoomController';
import { authWrapper } from '../middleware/authWrapper';
import { validateRoomData } from '../middleware/validation';

const router = Router();

// Public routes (no authentication required)
router.get('/public', RoomController.getPublicRooms);
router.get('/:roomId/details', RoomController.getRoomDetails);

// Protected routes (authentication required)
router.use(authWrapper);

// Room management
router.post('/', validateRoomData, RoomController.createRoom);
router.get('/user/:userId', RoomController.getUserRooms);
router.get('/user/:userId/stats', RoomController.getUserRoomStats);
router.post('/:roomId/join', RoomController.joinRoom);
router.post('/:roomId/leave', RoomController.leaveRoom);
router.put('/:roomId/settings', validateRoomData, RoomController.updateRoomSettings);
router.delete('/:roomId', RoomController.deleteRoom);

export default router;
