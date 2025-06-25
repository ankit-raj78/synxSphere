import { Request, Response } from 'express';
import { prisma } from '../../../../lib/prisma';
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

      // Get file info from database using Prisma
      const audioFile = await prisma.audioFile.findFirst({
        where: {
          id: fileId,
          userId: userId
        }
      });

      if (!audioFile) {
        res.status(404).json({ error: 'File not found or not accessible' });
        return;
      }

      // Check if analysis already exists using Prisma
      const existingAnalysis = await prisma.audioAnalysis.findFirst({
        where: { fileId: fileId }
      });

      if (existingAnalysis) {
        logger.info('Analysis already exists', { fileId });
        res.json({
          message: 'Analysis already exists',
          analysis: existingAnalysis
        });
        return;
      }

      // Perform analysis
      const filePath = audioFile.filePath;
      if (!filePath) {
        res.status(400).json({ error: 'File path not found' });
        return;
      }
      
      const analysis = await AudioProcessor.analyzeAudio(filePath);

      // Store analysis in database using Prisma
      const savedAnalysis = await prisma.audioAnalysis.create({
        data: {
          id: require('uuid').v4(),
          fileId: fileId,
          duration: analysis.duration,
          sampleRate: analysis.sample_rate,
          channels: analysis.channels,
          bitRate: analysis.bit_rate,
          codec: analysis.codec,
          format: analysis.format,
          size: analysis.size,
          analyzedAt: analysis.analyzed_at,
          createdAt: analysis.created_at,
          updatedAt: analysis.updated_at
        }
      });

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

      // Get analysis with file info using Prisma
      const analysis = await prisma.audioAnalysis.findFirst({
        where: { fileId: fileId },
        include: {
          file: {
            select: {
              originalName: true,
              userId: true
            }
          }
        }
      });

      if (!analysis) {
        res.status(404).json({ error: 'Analysis not found' });
        return;
      }

      res.json({
        analysis: {
          id: analysis.id,
          fileId: analysis.fileId,
          fileName: analysis.file?.originalName,
          duration: analysis.duration,
          sampleRate: analysis.sampleRate,
          channels: analysis.channels,
          bitRate: analysis.bitRate,
          codec: analysis.codec,
          format: analysis.format,
          size: analysis.size,
          tempo: analysis.tempo,
          key: analysis.keySignature,
          loudness: analysis.loudness,
          spectralFeatures: analysis.waveformData,
          analyzedAt: analysis.analyzedAt,
          createdAt: analysis.createdAt,
          updatedAt: analysis.updatedAt
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

      // Get analysis for both files using Prisma
      const analyses = await prisma.audioAnalysis.findMany({
        where: {
          fileId: { in: [fileId1, fileId2] },
          file: {
            userId: userId
          }
        },
        include: {
          file: {
            select: {
              originalName: true
            }
          }
        }
      });

      if (analyses.length !== 2) {
        res.status(404).json({ error: 'One or both files not found or not accessible' });
        return;
      }

      const analysis1 = analyses.find(a => a.fileId === fileId1);
      const analysis2 = analyses.find(a => a.fileId === fileId2);

      // Calculate similarity score (simplified implementation)
      const similarity = this.calculateSimilarity(analysis1, analysis2);

      res.json({
        comparison: {
          file1: {
            id: fileId1,
            name: analysis1?.file?.originalName,
            duration: analysis1?.duration,
            tempo: analysis1?.tempo,
            key: analysis1?.keySignature,
            loudness: analysis1?.loudness
          },
          file2: {
            id: fileId2,
            name: analysis2?.file?.originalName,
            duration: analysis2?.duration,
            tempo: analysis2?.tempo,
            key: analysis2?.keySignature,
            loudness: analysis2?.loudness
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

      // Get analyses for multiple files using Prisma
      const analysisResults = await prisma.audioAnalysis.findMany({
        where: {
          fileId: { in: fileIds },
          file: {
            userId: userId
          }
        },
        include: {
          file: {
            select: {
              originalName: true
            }
          }
        }
      });

      const analyses = analysisResults.map(analysis => ({
        id: analysis.id,
        fileId: analysis.fileId,
        fileName: analysis.file?.originalName,
        duration: analysis.duration,
        sampleRate: analysis.sampleRate,
        channels: analysis.channels,
        bitRate: analysis.bitRate,
        codec: analysis.codec,
        format: analysis.format,
        size: analysis.size,
        tempo: analysis.tempo,
        key: analysis.keySignature,
        loudness: analysis.loudness,
        spectralFeatures: analysis.waveformData,
        analyzedAt: analysis.analyzedAt
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

      // Get aggregated stats using Prisma
      const [totalStats, formatStats] = await Promise.all([
        // Get overall statistics
        prisma.audioAnalysis.aggregate({
          where: {
            file: {
              userId: userId
            }
          },
          _count: { id: true },
          _avg: {
            duration: true,
            sampleRate: true,
            bitRate: true
          }
        }),
        
        // Get format breakdown
        prisma.audioAnalysis.groupBy({
          by: ['format'],
          where: {
            file: {
              userId: userId
            }
          },
          _count: { format: true },
          _avg: { duration: true },
          orderBy: {
            _count: {
              format: 'desc'
            }
          }
        })
      ]);

      // Get additional stats that require joins
      const additionalStats = await prisma.audioFile.aggregate({
        where: { userId: userId },
        _sum: { fileSize: true }
      });

      const formatCount = await prisma.audioAnalysis.findMany({
        where: {
          file: {
            userId: userId
          }
        },
        select: { format: true },
        distinct: ['format']
      });

      res.json({
        statistics: {
          totalFiles: totalStats._count.id || 0,
          averageDuration: Number(totalStats._avg.duration) || 0,
          averageSampleRate: totalStats._avg.sampleRate || 0,
          averageBitRate: totalStats._avg.bitRate || 0,
          formatCount: formatCount.length || 0,
          totalSize: Number(additionalStats._sum.fileSize) || 0,
          formatBreakdown: formatStats.map(format => ({
            format: format.format,
            count: format._count.format,
            averageDuration: Number(format._avg.duration) || 0
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
    const tempoSimilarity = analysis1?.tempo && analysis2?.tempo
      ? Math.max(0, 1 - Math.abs(Number(analysis1.tempo) - Number(analysis2.tempo)) / 100)
      : 0.5;

    // Key similarity (simplified - would need proper music theory implementation)
    const keySimilarity = analysis1?.keySignature && analysis2?.keySignature
      ? analysis1.keySignature === analysis2.keySignature ? 1 : 0.3
      : 0.5;

    // Loudness similarity (based on dB difference)
    const loudnessSimilarity = analysis1?.loudness && analysis2?.loudness
      ? Math.max(0, 1 - Math.abs(Number(analysis1.loudness) - Number(analysis2.loudness)) / 20)
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
