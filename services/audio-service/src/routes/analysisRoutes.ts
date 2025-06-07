import { Router } from 'express';
import AnalysisController from '../controllers/AnalysisController';
import { verifyToken } from '../middleware/authWrapper';

const router = Router();

// Apply authentication to all analysis routes
router.use(verifyToken);

/**
 * @route POST /api/analysis/:fileId
 * @desc Analyze audio file and store results
 * @access Private
 */
router.post('/:fileId', AnalysisController.analyzeAudio.bind(AnalysisController));

/**
 * @route GET /api/analysis/:fileId
 * @desc Get existing analysis for a file
 * @access Private
 */
router.get('/:fileId', AnalysisController.getAnalysis.bind(AnalysisController));

/**
 * @route POST /api/analysis/compare
 * @desc Compare audio files for similarity
 * @access Private
 */
router.post('/compare', AnalysisController.compareAudio.bind(AnalysisController));

/**
 * @route POST /api/analysis/batch
 * @desc Get batch analysis for multiple files
 * @access Private
 */
router.post('/batch', AnalysisController.getBatchAnalysis.bind(AnalysisController));

/**
 * @route GET /api/analysis/stats/user
 * @desc Get analysis statistics for user's files
 * @access Private
 */
router.get('/stats/user', AnalysisController.getAnalysisStats.bind(AnalysisController));

export default router;
