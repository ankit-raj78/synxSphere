import { Router } from 'express';
import UploadController, { upload } from '../controllers/UploadController';
import { verifyToken } from '../middleware/authWrapper';

const router = Router();

// Apply authentication to all upload routes
router.use(verifyToken);

/**
 * @route POST /api/upload/single
 * @desc Upload a single audio file
 * @access Private
 */
router.post('/single', upload.single('audio'), UploadController.uploadSingle.bind(UploadController));

/**
 * @route POST /api/upload/multiple
 * @desc Upload multiple audio files
 * @access Private
 */
router.post('/multiple', upload.array('audio', 10), UploadController.uploadMultiple.bind(UploadController));

/**
 * @route GET /api/upload/progress/:uploadId
 * @desc Get upload progress for large file uploads
 * @access Private
 */
router.get('/progress/:uploadId', UploadController.getUploadProgress.bind(UploadController));

/**
 * @route DELETE /api/upload/:fileId
 * @desc Delete an uploaded file
 * @access Private
 */
router.delete('/:fileId', UploadController.deleteFile.bind(UploadController));

export default router;
