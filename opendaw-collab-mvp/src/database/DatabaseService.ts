import { Pool, PoolClient } from 'pg'

export interface BoxOwnership {
  projectId: string
  boxUuid: string
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
    this.pool = new Pool({
      connectionString,
      max: 20,                          // Increase max connections
      idleTimeoutMillis: 30000,         // 30 seconds idle timeout
      connectionTimeoutMillis: 10000,   // 10 seconds connection timeout (was 2 seconds)
      keepAlive: true,                  // Keep connections alive
    })
  }

  async getBoxOwner(projectId: string, boxUuid: string): Promise<string | null> {
    try {
      const result = await this.pool.query(
        'SELECT owner_id FROM box_ownership WHERE project_id = $1 AND box_uuid = $2',
        [projectId, boxUuid]
      )
      return result.rows[0]?.owner_id || null
    } catch (error) {
      console.error('Error getting box owner:', error)
      return null
    }
  }

  async setBoxOwner(projectId: string, boxUuid: string, ownerId: string): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO box_ownership (project_id, box_uuid, owner_id) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (project_id, box_uuid) 
         DO UPDATE SET owner_id = $3, owned_at = NOW()`,
        [projectId, boxUuid, ownerId]
      )
    } catch (error) {
      console.error('Error setting box owner:', error)
      throw error
    }
  }

  async getProjectOwnership(projectId: string): Promise<Record<string, string>> {
    try {
      const result = await this.pool.query(
        'SELECT box_uuid, owner_id FROM box_ownership WHERE project_id = $1',
        [projectId]
      )
      
      const ownership: Record<string, string> = {}
      result.rows.forEach(row => {
        ownership[row.box_uuid] = row.owner_id
      })
      return ownership
    } catch (error) {
      console.error('Error getting project ownership:', error)
      return {}
    }
  }

  async lockBox(projectId: string, boxUuid: string, userId: string, durationMs: number = 30000): Promise<boolean> {
    const client: PoolClient = await this.pool.connect()
    try {
      await client.query('BEGIN')
      
      // Check if box is already locked by someone else
      const existingLock = await client.query(
        'SELECT locked_by FROM box_locks WHERE project_id = $1 AND box_uuid = $2 AND expires_at > NOW()',
        [projectId, boxUuid]
      )
      
      if (existingLock.rows.length > 0 && existingLock.rows[0].locked_by !== userId) {
        await client.query('ROLLBACK')
        return false
      }
      
      // Create or update lock
      const expiresAt = new Date(Date.now() + durationMs)
      await client.query(
        `INSERT INTO box_locks (project_id, box_uuid, locked_by, expires_at) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (project_id, box_uuid) 
         DO UPDATE SET locked_by = $3, locked_at = NOW(), expires_at = $4`,
        [projectId, boxUuid, userId, expiresAt]
      )
      
      await client.query('COMMIT')
      return true
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error locking box:', error)
      return false
    } finally {
      client.release()
    }
  }

  async unlockBox(projectId: string, boxUuid: string, userId: string): Promise<void> {
    try {
      await this.pool.query(
        'DELETE FROM box_locks WHERE project_id = $1 AND box_uuid = $2 AND locked_by = $3',
        [projectId, boxUuid, userId]
      )
    } catch (error) {
      console.error('Error unlocking box:', error)
      throw error
    }
  }

  async isBoxLocked(projectId: string, boxUuid: string): Promise<string | null> {
    try {
      const result = await this.pool.query(
        'SELECT locked_by FROM box_locks WHERE project_id = $1 AND box_uuid = $2 AND expires_at > NOW()',
        [projectId, boxUuid]
      )
      return result.rows[0]?.locked_by || null
    } catch (error) {
      console.error('Error checking box lock:', error)
      return null
    }
  }

  async createUserSession(sessionId: string, projectId: string, userId: string): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO collaboration_user_sessions (id, project_id, user_id) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (id) 
         DO UPDATE SET last_seen = NOW()`,
        [sessionId, projectId, userId]
      )
    } catch (error) {
      console.error('Error creating user session:', error)
      throw error
    }
  }

  async removeUserSession(sessionId: string): Promise<void> {
    try {
      await this.pool.query('DELETE FROM collaboration_user_sessions WHERE id = $1', [sessionId])
    } catch (error) {
      console.error('Error removing user session:', error)
      throw error
    }
  }

  async getActiveUsers(projectId: string): Promise<string[]> {
    try {
      // Consider users active if they were seen in the last 5 minutes
      const result = await this.pool.query(
        'SELECT DISTINCT user_id FROM collaboration_user_sessions WHERE project_id = $1 AND last_seen > NOW() - INTERVAL \'5 minutes\'',
        [projectId]
      )
      return result.rows.map(row => row.user_id)
    } catch (error) {
      console.error('Error getting active users:', error)
      return []
    }
  }

  async cleanupExpiredLocks(): Promise<number> {
    try {
      const result = await this.pool.query('SELECT cleanup_expired_locks()')
      return result.rows[0].cleanup_expired_locks
    } catch (error) {
      console.error('Error cleaning up expired locks:', error)
      return 0
    }
  }

  async close(): Promise<void> {
    await this.pool.end()
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1')
      return true
    } catch (error) {
      console.error('Database ping failed:', error)
      return false
    }
  }

  // Project persistence methods
  async saveProject(projectId: string, projectData: any): Promise<void> {
    try {
      // Extract room_id from project_id if it follows the pattern "room-{roomId}"
      const roomId = projectId.startsWith('room-') ? projectId.substring(5) : null
      
      await this.pool.query(
        `INSERT INTO collaboration_projects (id, room_id, name, data, updated_at) 
         VALUES ($1, $2, $3, $4, NOW()) 
         ON CONFLICT (id) 
         DO UPDATE SET 
           data = $4, 
           updated_at = NOW()`,
        [projectId, roomId, projectData.name || projectId, JSON.stringify(projectData)]
      )
    } catch (error) {
      console.error('Error saving project:', error)
      throw error
    }
  }

  async loadProject(projectId: string): Promise<any | null> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM collaboration_projects WHERE id = $1',
        [projectId]
      )
      
      if (result.rows.length === 0) {
        return null
      }
      
      const project = result.rows[0]
      return {
        id: project.id,
        roomId: project.room_id,
        name: project.name,
        data: JSON.parse(project.data || '{}'),
        createdAt: project.created_at,
        updatedAt: project.updated_at
      }
    } catch (error) {
      console.error('Error loading project:', error)
      return null
    }
  }
}
