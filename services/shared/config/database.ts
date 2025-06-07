import { Pool, PoolClient } from 'pg';
import { MongoClient, GridFSBucket, Db } from 'mongodb';
import { createClient, RedisClientType } from 'redis';
import { HealthCheckResult } from '../types';

class DatabaseManager {
  public postgres: Pool | null = null;
  public mongodb: Db | null = null;
  public redis: RedisClientType | null = null;
  public gridFS: GridFSBucket | null = null;
  private mongoClient: MongoClient | null = null;

  async initialize(): Promise<void> {
    try {
      // PostgreSQL connection
      this.postgres = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'syncsphere',
        user: process.env.POSTGRES_USER || 'syncsphere',
        password: process.env.POSTGRES_PASSWORD || 'syncsphere_password',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test PostgreSQL connection
      await this.postgres.query('SELECT 1');

      // MongoDB connection
      this.mongoClient = new MongoClient(
        process.env.MONGODB_URI || 'mongodb://localhost:27017/syncsphere'
      );
      await this.mongoClient.connect();
      this.mongodb = this.mongoClient.db('syncsphere');
      this.gridFS = new GridFSBucket(this.mongodb, { bucketName: 'audio_files' });

      // Test MongoDB connection
      await this.mongodb.admin().ping();

      // Redis connection
      this.redis = createClient({
        url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`,
        password: process.env.REDIS_PASSWORD || undefined,
      });

      await this.redis.connect();

      // Test Redis connection
      await this.redis.ping();

      console.log('All databases connected successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const services = {
      postgres: false,
      mongodb: false,
      redis: false,
    };

    try {
      // Test PostgreSQL
      if (this.postgres) {
        await this.postgres.query('SELECT 1');
        services.postgres = true;
      }

      // Test MongoDB
      if (this.mongodb) {
        await this.mongodb.admin().ping();
        services.mongodb = true;
      }

      // Test Redis
      if (this.redis) {
        await this.redis.ping();
        services.redis = true;
      }

      const allHealthy = Object.values(services).every(Boolean);

      return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        services,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        services,
      };
    }
  }

  async close(): Promise<void> {
    try {
      if (this.postgres) {
        await this.postgres.end();
        this.postgres = null;
      }

      if (this.mongoClient) {
        await this.mongoClient.close();
        this.mongoClient = null;
        this.mongodb = null;
        this.gridFS = null;
      }

      if (this.redis) {
        await this.redis.quit();
        this.redis = null;
      }

      console.log('All database connections closed');
    } catch (error) {
      console.error('Error closing database connections:', error);
      throw error;
    }
  }

  // Helper method to get a PostgreSQL client with transaction support
  async getPostgresClient(): Promise<PoolClient> {
    if (!this.postgres) {
      throw new Error('PostgreSQL not initialized');
    }
    return this.postgres.connect();
  }

  // Helper method to execute queries with error handling
  async executeQuery<T = any>(query: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number | null }> {
    if (!this.postgres) {
      throw new Error('PostgreSQL not initialized');
    }
    
    try {
      const result = await this.postgres.query(query, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount
      };
    } catch (error) {
      console.error('Query execution error:', error);
      throw error;
    }
  }
}

export default new DatabaseManager();
