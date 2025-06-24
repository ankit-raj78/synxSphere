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
      // Use DATABASE_URL if available, otherwise fall back to individual env vars
      if (process.env.DATABASE_URL) {
        console.log('🔗 Using DATABASE_URL for database connection:', process.env.DATABASE_URL.substring(0, 30) + '...');
        this.pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        })
      } else {
        const host = process.env.POSTGRES_HOST || 'localhost';
        const port = parseInt(process.env.POSTGRES_PORT || '5432');
        console.log(`🔗 Using individual env vars for database connection: ${host}:${port}`);
        this.pool = new Pool({
          host: host,
          port: port,
          database: process.env.POSTGRES_DB || 'syncsphere',
          user: process.env.POSTGRES_USER || 'postgres',
          password: process.env.POSTGRES_PASSWORD || 'root',
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        })
      }
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
