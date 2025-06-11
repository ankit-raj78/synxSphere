// Database connection specifically for Next.js application
// This file replaces the services/shared/config/database.ts import for the Next.js app

import { Pool, PoolClient } from 'pg'

class NextJSDatabaseManager {
  private static instance: NextJSDatabaseManager
  private pool: Pool | null = null

  private constructor() {}

  static getInstance(): NextJSDatabaseManager {
    if (!NextJSDatabaseManager.instance) {
      NextJSDatabaseManager.instance = new NextJSDatabaseManager()
    }
    return NextJSDatabaseManager.instance
  }

  async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'syncsphere',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'root',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      })
    }
    return this.pool
  }
  async executeQuery<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const pool = await this.getPool()
    const client = await pool.connect()
    
    try {
      const result = await client.query(query, params)
      return { rows: result.rows, rowCount: result.rowCount || 0 }
    } finally {
      client.release()
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }
  }
}

export default NextJSDatabaseManager.getInstance()
