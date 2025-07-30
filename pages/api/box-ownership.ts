import type { NextApiRequest, NextApiResponse } from 'next'
import { DatabaseService } from '../../opendaw-collab-mvp/src/database/DatabaseService'
import { verifyToken } from '../../lib/auth'

const dbService = new DatabaseService(process.env.DATABASE_URL || 'postgresql://opendaw_user:opendaw_pass@localhost:5432/opendaw_collab')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 验证认证
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.substring(7)
  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  if (req.method === 'POST') {
    try {
      const { projectId, roomId, userId, boxType, boxUuid } = req.body

      if (!projectId || !userId || !boxType || !boxUuid) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      // 验证 boxType
      if (boxType !== 'TrackBox' && boxType !== 'AudioUnitBox') {
        return res.status(400).json({ error: 'Invalid box type' })
      }

      console.log(`[API] Registering ${boxType} ownership:`, { projectId, userId, boxUuid })

      // 根据 box 类型调用相应的方法
      if (boxType === 'TrackBox') {
        await dbService.setTrackBoxOwner(projectId, boxUuid, userId, roomId)
      } else if (boxType === 'AudioUnitBox') {
        await dbService.setAudioUnitBoxOwner(projectId, boxUuid, userId, roomId)
      }

      res.status(200).json({ 
        success: true, 
        message: `${boxType} ownership registered`,
        boxUuid,
        ownerId: userId
      })
    } catch (error) {
      console.error('[API] Error registering box ownership:', error)
      res.status(500).json({ error: 'Failed to register ownership' })
    }
  } else if (req.method === 'GET') {
    // 获取项目的所有权信息
    try {
      const { projectId } = req.query

      if (!projectId || typeof projectId !== 'string') {
        return res.status(400).json({ error: 'Missing project ID' })
      }

      const ownership = await dbService.getProjectOwnership(projectId)
      res.status(200).json(ownership)
    } catch (error) {
      console.error('[API] Error getting ownership:', error)
      res.status(500).json({ error: 'Failed to get ownership' })
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
} 