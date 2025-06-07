import { Router } from 'express';
import StreamingController from '../controllers/StreamingController';
import { verifyToken } from '../middleware/authWrapper';

const router = Router();

/**
 * @route GET /api/stream/audio/:fileId
 * @desc Stream audio file with range support
 * @access Public (but may check authentication for private files)
 */
router.get('/audio/:fileId', StreamingController.streamAudio.bind(StreamingController));

/**
 * @route GET /api/stream/download/:fileId
 * @desc Download audio file
 * @access Public (but may check authentication for private files)
 */
router.get('/download/:fileId', StreamingController.downloadAudio.bind(StreamingController));

/**
 * @route GET /api/stream/metadata/:fileId
 * @desc Get audio metadata for streaming clients
 * @access Public
 */
router.get('/metadata/:fileId', StreamingController.getAudioMetadata.bind(StreamingController));

/**
 * @route GET /api/stream/waveform/:fileId
 * @desc Get waveform data for visualization
 * @access Public
 */
router.get('/waveform/:fileId', StreamingController.getWaveform.bind(StreamingController));

/**
 * @route GET /api/stream/playlist
 * @desc Get playlist/queue for continuous streaming
 * @access Private
 */
router.get('/playlist', verifyToken, StreamingController.getPlaylist.bind(StreamingController));

export default router;
