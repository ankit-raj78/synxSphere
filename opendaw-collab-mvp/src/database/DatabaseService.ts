import { Pool, PoolClient } from 'pg'
import { CollabMessage } from "../websocket/MessageTypes"

export interface BoxOwnership {
  projectId: string
  roomId?: string
  trackboxUuid?: string
  audiounitboxUuid?: string
  ownerId: string
  ownedAt: Date
}

export interface BoxLock {
  projectId: string
  boxUuid: string
  lockedBy: string
  lockedAt: Date
  expiresAt: Date
}

export interface UserSession {
  id: string
  projectId: string
  userId: string
  connectedAt: Date
  lastSeen: Date
}

export class DatabaseService {
  private pool: Pool

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString })
  }

  async initialize(): Promise<void> {
    // Test connection
    const client = await this.pool.connect()
    try {
      await client.query('SELECT NOW()')
      console.log('Database connection established')
    } finally {
      client.release()
    }
  }

  async close(): Promise<void> {
    await this.pool.end()
  }

  // Box ownership methods
  async setTrackBoxOwner(projectId: string, trackboxUuid: string, ownerId: string, roomId?: string): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO box_ownership (project_id, trackbox_uuid, owner_id, room_id) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (project_id, COALESCE(trackbox_uuid, audiounitbox_uuid)) 
         DO UPDATE SET owner_id = $3, owned_at = NOW(), room_id = $4`,
        [projectId, trackboxUuid, ownerId, roomId]
      )
    } catch (error) {
      console.error('Error setting trackbox owner:', error)
      throw error
    }
  }

  async setAudioUnitBoxOwner(projectId: string, audiounitboxUuid: string, ownerId: string, roomId?: string): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO box_ownership (project_id, audiounitbox_uuid, owner_id, room_id) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (project_id, COALESCE(trackbox_uuid, audiounitbox_uuid)) 
         DO UPDATE SET owner_id = $3, owned_at = NOW(), room_id = $4`,
        [projectId, audiounitboxUuid, ownerId, roomId]
      )
    } catch (error) {
      console.error('Error setting audiounitbox owner:', error)
      throw error
    }
  }

  async getProjectOwnership(projectId: string): Promise<{
    trackBoxes: Record<string, string>,
    audioUnitBoxes: Record<string, string>
  }> {
    try {
      const result = await this.pool.query(
        'SELECT trackbox_uuid, audiounitbox_uuid, owner_id, room_id FROM box_ownership WHERE project_id = $1',
        [projectId]
      )
      
      const trackBoxes: Record<string, string> = {}
      const audioUnitBoxes: Record<string, string> = {}
      
      result.rows.forEach(row => {
        if (row.trackbox_uuid) {
          trackBoxes[row.trackbox_uuid] = row.owner_id
        }
        if (row.audiounitbox_uuid) {
          audioUnitBoxes[row.audiounitbox_uuid] = row.owner_id
        }
      })
      
      return { trackBoxes, audioUnitBoxes }
    } catch (error) {
      console.error('Error getting project ownership:', error)
      return { trackBoxes: {}, audioUnitBoxes: {} }
    }
  }

  async lockBox(projectId: string, boxUuid: string, userId: string, durationMs: number = 30000): Promise<boolean> {
    const expiresAt = new Date(Date.now() + durationMs)
    
    try {
      // Try to acquire lock
      const result = await this.pool.query(
        `INSERT INTO box_locks (project_id, box_uuid, locked_by, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (project_id, box_uuid) DO NOTHING
         RETURNING *`,
        [projectId, boxUuid, userId, expiresAt]
      )
      
      if (result.rowCount === 0) {
        // Check if existing lock is expired
        const existingLock = await this.pool.query(
          'SELECT * FROM box_locks WHERE project_id = $1 AND box_uuid = $2',
          [projectId, boxUuid]
        )
        
        if (existingLock.rows.length > 0 && new Date(existingLock.rows[0].expires_at) < new Date()) {
          // Lock expired, try to update
          const updateResult = await this.pool.query(
            `UPDATE box_locks 
             SET locked_by = $3, locked_at = NOW(), expires_at = $4
             WHERE project_id = $1 AND box_uuid = $2 AND expires_at < NOW()`,
            [projectId, boxUuid, userId, expiresAt]
          )
          return (updateResult.rowCount ?? 0) > 0
        }
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error acquiring lock:', error)
      return false
    }
  }

  async unlockBox(projectId: string, boxUuid: string, userId: string): Promise<void> {
    try {
      await this.pool.query(
        'DELETE FROM box_locks WHERE project_id = $1 AND box_uuid = $2 AND locked_by = $3',
        [projectId, boxUuid, userId]
      )
    } catch (error) {
      console.error('Error releasing lock:', error)
    }
  }

  async cleanupExpiredLocks(): Promise<number> {
    try {
      const result = await this.pool.query(
        'DELETE FROM box_locks WHERE expires_at < NOW()'
      )
      return result.rowCount ?? 0
    } catch (error) {
      console.error('Error cleaning up expired locks:', error)
      return 0
    }
  }

  // 清理权限缓存（在项目切换时调用）
  clearOwnershipCache(): void {
    // this.trackOwnershipCache.clear() // This line was not in the new_code, so it's removed.
    // this.pendingOwnershipChecks.clear() // This line was not in the new_code, so it's removed.
  }
  
  // Event persistence methods
  async saveEvent(event: CollabMessage): Promise<void> {
    // For now, we'll just log the event
    // In a production system, you might want to save these to a separate events table
    console.log('[DatabaseService] Event saved:', event.type, event.data)
  }
  
  async getEvents(projectId: string, since?: number): Promise<CollabMessage[]> {
    // For now, return empty array
    // In a production system, you would query the events table
    console.log('[DatabaseService] Getting events for project:', projectId, 'since:', since)
    return []
  }
  
  // User session methods
  async createUserSession(sessionId: string, projectId: string, userId: string): Promise<void> {
    try {
      await this.pool.query(
        'INSERT INTO user_sessions (id, project_id, user_id) VALUES ($1, $2, $3)',
        [sessionId, projectId, userId]
      )
    } catch (error) {
      console.error('Error creating user session:', error)
      throw error
    }
  }

  async updateUserSession(sessionId: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE user_sessions SET last_seen = NOW() WHERE id = $1',
        [sessionId]
      )
    } catch (error) {
      console.error('Error updating user session:', error)
    }
  }

  async removeUserSession(sessionId: string): Promise<void> {
    try {
      await this.pool.query(
        'DELETE FROM user_sessions WHERE id = $1',
        [sessionId]
      )
    } catch (error) {
      console.error('Error removing user session:', error)
    }
  }

  async getActiveUsers(projectId: string): Promise<string[]> {
    try {
      const result = await this.pool.query(
        `SELECT DISTINCT user_id FROM user_sessions 
         WHERE project_id = $1 AND last_seen > NOW() - INTERVAL '5 minutes'`,
        [projectId]
      )
      return result.rows.map(row => row.user_id)
    } catch (error) {
      console.error('Error getting active users:', error)
      return []
    }
  }

  // Project methods
  async saveProject(projectId: string, data: Buffer): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO projects (id, data) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        [projectId, data]
      )
    } catch (error) {
      console.error('Error saving project:', error)
      throw error
    }
  }

  async loadProject(projectId: string): Promise<Buffer | null> {
    try {
      const result = await this.pool.query(
        'SELECT data FROM projects WHERE id = $1',
        [projectId]
      )
      return result.rows.length > 0 ? result.rows[0].data : null
    } catch (error) {
      console.error('Error loading project:', error)
      return null
    }
  }

  async getProjectByRoomId(roomId: string): Promise<{ id: string, data: Buffer } | null> {
    try {
      const result = await this.pool.query(
        'SELECT id, data FROM projects WHERE room_id = $1',
        [roomId]
      )
      return result.rows.length > 0 ? result.rows[0] : null
    } catch (error) {
      console.error('Error getting project by room ID:', error)
      return null
    }
  }

  async setProjectRoomId(projectId: string, roomId: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE projects SET room_id = $1 WHERE id = $2',
        [roomId, projectId]
      )
    } catch (error) {
      console.error('Error setting project room ID:', error)
      throw error
    }
  }

  // Transaction support
  async beginTransaction(): Promise<PoolClient> {
    const client = await this.pool.connect()
    await client.query('BEGIN')
    return client
  }

  async commitTransaction(client: PoolClient): Promise<void> {
    try {
      await client.query('COMMIT')
    } finally {
      client.release()
    }
  }

  async rollbackTransaction(client: PoolClient): Promise<void> {
    try {
      await client.query('ROLLBACK')
    } finally {
      client.release()
    }
  }

  // Utility method to execute raw queries (for testing/debugging)
  async query(text: string, params?: any[]): Promise<any> {
    return this.pool.query(text, params)
  }
}








