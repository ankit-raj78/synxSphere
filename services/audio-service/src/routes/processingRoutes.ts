import { Router } from 'express';
import ProcessingController from '../controllers/ProcessingController';
import { verifyToken } from '../middleware/authWrapper';

const router = Router();

// Apply authentication to all processing routes
router.use(verifyToken);

/**
 * @route POST /api/processing/mix
 * @desc Mix multiple audio tracks into one
 * @access Private
 */
router.post('/mix', ProcessingController.mixTracks.bind(ProcessingController));

/**
 * @route POST /api/processing/effects
 * @desc Apply audio effects to a track
 * @access Private
 */
router.post('/effects', ProcessingController.applyEffects.bind(ProcessingController));

/**
 * @route POST /api/processing/convert
 * @desc Convert audio file format
 * @access Private
 */
router.post('/convert', ProcessingController.convertFormat.bind(ProcessingController));

/**
 * @route POST /api/processing/extract
 * @desc Extract audio segment from a file
 * @access Private
 */
router.post('/extract', ProcessingController.extractSegment.bind(ProcessingController));

/**
 * @route GET /api/processing/status/:processId
 * @desc Get processing status for long-running operations
 * @access Private
 */
router.get('/status/:processId', ProcessingController.getProcessingStatus.bind(ProcessingController));

export default router;
