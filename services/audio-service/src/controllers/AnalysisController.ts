import { Request, Response } from 'express';
import DatabaseManager from '../../../shared/config/database';
import { AudioFile } from '../../../shared/types';
import { createLogger } from '../utils/logger';
import AudioProcessor from '../services/AudioProcessor';

const logger = createLogger('AnalysisController');

export class AnalysisController {
  /**
   * Analyze audio file and store results
   */
  async analyzeAudio(req: Request, res: Response): Promise<void> {
    try {
      const fileId = req.params.fileId;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!fileId) {
        res.status(400).json({ error: 'File ID is required' });
        return;
      }

      logger.info('Starting audio analysis', { fileId, userId });

      // Get file info from database
      const fileQuery = 'SELECT * FROM audio_files WHERE id = $1 AND user_id = $2';
      const fileResult = await DatabaseManager.executeQuery<AudioFile>(fileQuery, [fileId, userId]);

      if (fileResult.rows.length === 0) {
        res.status(404).json({ error: 'File not found or not accessible' });
        return;
      }

      const audioFile = fileResult.rows[0];

      // Check if analysis already exists
      const existingAnalysisQuery = 'SELECT * FROM audio_analysis WHERE file_id = $1';
      const existingResult = await DatabaseManager.executeQuery(existingAnalysisQuery, [fileId]);

      if (existingResult.rows.length > 0) {
        logger.info('Analysis already exists', { fileId });
        res.json({
          message: 'Analysis already exists',
          analysis: existingResult.rows[0]
        });
        return;
      }

      // Perform analysis
      const filePath = audioFile.file_path || audioFile.filepath;
      if (!filePath) {
        res.status(400).json({ error: 'File path not found' });
        return;
      }
      
      const analysis = await AudioProcessor.analyzeAudio(filePath);

      // Store analysis in database
      analysis.id = require('uuid').v4();
      analysis.file_id = fileId;

      const insertQuery = `
        INSERT INTO audio_analysis (
          id, file_id, duration, sample_rate, channels, bit_rate, 
          codec, format, size, analyzed_at, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const insertValues = [
        analysis.id,
        analysis.file_id,
        analysis.duration,
        analysis.sample_rate,
        analysis.channels,
        analysis.bit_rate,
        analysis.codec,
        analysis.format,
        analysis.size,
        analysis.analyzed_at,
        analysis.created_at,
        analysis.updated_at
      ];

      const result = await DatabaseManager.executeQuery(insertQuery, insertValues);
      const savedAnalysis = result.rows[0];

      logger.info('Audio analysis completed and saved', { 
        fileId, 
        analysisId: savedAnalysis.id 
      });

      res.status(201).json({
        message: 'Audio analysis completed successfully',
        analysis: savedAnalysis
      });

    } catch (error) {
      logger.error('Audio analysis failed', { error });
      res.status(500).json({ 
        error: 'Audio analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get existing analysis for a file
   */
  async getAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const fileId = req.params.fileId;

      if (!fileId) {
        res.status(400).json({ error: 'File ID is required' });
        return;
      }

      logger.info('Getting audio analysis', { fileId });

      const analysisQuery = `
        SELECT aa.*, af.original_name, af.user_id
        FROM audio_analysis aa
        JOIN audio_files af ON aa.file_id = af.id
        WHERE aa.file_id = $1
      `;

      const result = await DatabaseManager.executeQuery(analysisQuery, [fileId]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Analysis not found' });
        return;
      }

      const analysis = result.rows[0];

      res.json({
        analysis: {
          id: analysis.id,
          fileId: analysis.file_id,
          fileName: analysis.original_name,
          duration: analysis.duration,
          sampleRate: analysis.sample_rate,
          channels: analysis.channels,
          bitRate: analysis.bit_rate,
          codec: analysis.codec,
          format: analysis.format,
          size: analysis.size,
          tempo: analysis.tempo,
          key: analysis.key,
          loudness: analysis.loudness,
          spectralFeatures: analysis.spectral_features,
          analyzedAt: analysis.analyzed_at,
          createdAt: analysis.created_at,
          updatedAt: analysis.updated_at
        }
      });

      logger.info('Audio analysis retrieved', { fileId, analysisId: analysis.id });

    } catch (error) {
      logger.error('Failed to get audio analysis', { error });
      res.status(500).json({ 
        error: 'Failed to get audio analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Compare audio files for similarity
   */
  async compareAudio(req: Request, res: Response): Promise<void> {
    try {
      const { fileId1, fileId2 } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!fileId1 || !fileId2) {
        res.status(400).json({ error: 'Both file IDs are required' });
        return;
      }

      logger.info('Comparing audio files', { fileId1, fileId2, userId });

      // Get analysis for both files
      const analysisQuery = `
        SELECT aa.*, af.original_name
        FROM audio_analysis aa
        JOIN audio_files af ON aa.file_id = af.id
        WHERE aa.file_id IN ($1, $2) AND af.user_id = $3
      `;

      const result = await DatabaseManager.executeQuery(
        analysisQuery, 
        [fileId1, fileId2, userId]
      );

      if (result.rows.length !== 2) {
        res.status(404).json({ error: 'One or both files not found or not accessible' });
        return;
      }

      const [analysis1, analysis2] = result.rows;

      // Calculate similarity score (simplified implementation)
      const similarity = this.calculateSimilarity(analysis1, analysis2);

      res.json({
        comparison: {
          file1: {
            id: fileId1,
            name: analysis1.original_name,
            duration: analysis1.duration,
            tempo: analysis1.tempo,
            key: analysis1.key,
            loudness: analysis1.loudness
          },
          file2: {
            id: fileId2,
            name: analysis2.original_name,
            duration: analysis2.duration,
            tempo: analysis2.tempo,
            key: analysis2.key,
            loudness: analysis2.loudness
          },
          similarity: {
            overall: similarity.overall,
            tempo: similarity.tempo,
            key: similarity.key,
            loudness: similarity.loudness,
            spectral: similarity.spectral
          }
        }
      });

      logger.info('Audio comparison completed', { 
        fileId1, 
        fileId2, 
        overallSimilarity: similarity.overall 
      });

    } catch (error) {
      logger.error('Audio comparison failed', { error });
      res.status(500).json({ 
        error: 'Audio comparison failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get batch analysis for multiple files
   */
  async getBatchAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { fileIds } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        res.status(400).json({ error: 'File IDs array is required' });
        return;
      }

      logger.info('Getting batch analysis', { fileIds, userId });

      const analysisQuery = `
        SELECT aa.*, af.original_name, af.user_id
        FROM audio_analysis aa
        JOIN audio_files af ON aa.file_id = af.id
        WHERE aa.file_id = ANY($1) AND af.user_id = $2
      `;

      const result = await DatabaseManager.executeQuery(analysisQuery, [fileIds, userId]);

      const analyses = result.rows.map(analysis => ({
        id: analysis.id,
        fileId: analysis.file_id,
        fileName: analysis.original_name,
        duration: analysis.duration,
        sampleRate: analysis.sample_rate,
        channels: analysis.channels,
        bitRate: analysis.bit_rate,
        codec: analysis.codec,
        format: analysis.format,
        size: analysis.size,
        tempo: analysis.tempo,
        key: analysis.key,
        loudness: analysis.loudness,
        spectralFeatures: analysis.spectral_features,
        analyzedAt: analysis.analyzed_at
      }));

      res.json({
        analyses,
        totalCount: analyses.length,
        requestedCount: fileIds.length
      });

      logger.info('Batch analysis retrieved', { 
        requestedFiles: fileIds.length,
        returnedAnalyses: analyses.length 
      });

    } catch (error) {
      logger.error('Batch analysis retrieval failed', { error });
      res.status(500).json({ 
        error: 'Batch analysis retrieval failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get analysis statistics for user's files
   */
  async getAnalysisStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      logger.info('Getting analysis statistics', { userId });

      const statsQuery = `
        SELECT 
          COUNT(*) as total_files,
          AVG(aa.duration) as avg_duration,
          AVG(aa.sample_rate) as avg_sample_rate,
          AVG(aa.bit_rate) as avg_bit_rate,
          COUNT(DISTINCT aa.format) as format_count,
          SUM(af.file_size) as total_size
        FROM audio_analysis aa
        JOIN audio_files af ON aa.file_id = af.id
        WHERE af.user_id = $1
      `;

      const formatStatsQuery = `
        SELECT 
          aa.format,
          COUNT(*) as count,
          AVG(aa.duration) as avg_duration
        FROM audio_analysis aa
        JOIN audio_files af ON aa.file_id = af.id
        WHERE af.user_id = $1
        GROUP BY aa.format
        ORDER BY count DESC
      `;

      const [statsResult, formatResult] = await Promise.all([
        DatabaseManager.executeQuery(statsQuery, [userId]),
        DatabaseManager.executeQuery(formatStatsQuery, [userId])
      ]);

      const stats = statsResult.rows[0];
      const formatStats = formatResult.rows;

      res.json({
        statistics: {
          totalFiles: parseInt(stats.total_files) || 0,
          averageDuration: parseFloat(stats.avg_duration) || 0,
          averageSampleRate: parseFloat(stats.avg_sample_rate) || 0,
          averageBitRate: parseFloat(stats.avg_bit_rate) || 0,
          formatCount: parseInt(stats.format_count) || 0,
          totalSize: parseInt(stats.total_size) || 0,
          formatBreakdown: formatStats.map(format => ({
            format: format.format,
            count: parseInt(format.count),
            averageDuration: parseFloat(format.avg_duration) || 0
          }))
        }
      });

      logger.info('Analysis statistics retrieved', { userId });

    } catch (error) {
      logger.error('Failed to get analysis statistics', { error });
      res.status(500).json({ 
        error: 'Failed to get analysis statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Calculate similarity between two audio analyses (simplified implementation)
   */
  private calculateSimilarity(analysis1: any, analysis2: any): {
    overall: number;
    tempo: number;
    key: number;
    loudness: number;
    spectral: number;
  } {
    // Tempo similarity (based on BPM difference)
    const tempoSimilarity = analysis1.tempo && analysis2.tempo
      ? Math.max(0, 1 - Math.abs(analysis1.tempo - analysis2.tempo) / 100)
      : 0.5;

    // Key similarity (simplified - would need proper music theory implementation)
    const keySimilarity = analysis1.key && analysis2.key
      ? analysis1.key === analysis2.key ? 1 : 0.3
      : 0.5;

    // Loudness similarity (based on dB difference)
    const loudnessSimilarity = analysis1.loudness && analysis2.loudness
      ? Math.max(0, 1 - Math.abs(analysis1.loudness - analysis2.loudness) / 20)
      : 0.5;

    // Spectral similarity (mock implementation)
    const spectralSimilarity = 0.7; // Would need actual spectral analysis

    // Overall similarity (weighted average)
    const overall = (
      tempoSimilarity * 0.3 +
      keySimilarity * 0.25 +
      loudnessSimilarity * 0.2 +
      spectralSimilarity * 0.25
    );

    return {
      overall: Math.round(overall * 100) / 100,
      tempo: Math.round(tempoSimilarity * 100) / 100,
      key: Math.round(keySimilarity * 100) / 100,
      loudness: Math.round(loudnessSimilarity * 100) / 100,
      spectral: Math.round(spectralSimilarity * 100) / 100
    };
  }
}

export default new AnalysisController();
