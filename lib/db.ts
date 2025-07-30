import databaseManager from './database'

export const db = {
  async query(text: string, params?: any[]) {
    const pool = await databaseManager.getPool()
    return pool.query(text, params)
  }
} 