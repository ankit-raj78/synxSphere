"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const mongodb_1 = require("mongodb");
const redis_1 = require("redis");
class DatabaseManager {
    constructor() {
        this.postgres = null;
        this.mongodb = null;
        this.redis = null;
        this.gridFS = null;
        this.mongoClient = null;
    }
    async initialize() {
        try {
            this.postgres = new pg_1.Pool({
                host: process.env.POSTGRES_HOST || 'localhost',
                port: parseInt(process.env.POSTGRES_PORT || '5432'),
                database: process.env.POSTGRES_DB || 'syncsphere',
                user: process.env.POSTGRES_USER || 'syncsphere',
                password: process.env.POSTGRES_PASSWORD || 'syncsphere_password',
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });
            await this.postgres.query('SELECT 1');
            this.mongoClient = new mongodb_1.MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/syncsphere');
            await this.mongoClient.connect();
            this.mongodb = this.mongoClient.db('syncsphere');
            this.gridFS = new mongodb_1.GridFSBucket(this.mongodb, { bucketName: 'audio_files' });
            await this.mongodb.admin().ping();
            this.redis = (0, redis_1.createClient)({
                url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`,
                password: process.env.REDIS_PASSWORD || undefined,
            });
            await this.redis.connect();
            await this.redis.ping();
            console.log('All databases connected successfully');
        }
        catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }
    async healthCheck() {
        const services = {
            postgres: false,
            mongodb: false,
            redis: false,
        };
        try {
            if (this.postgres) {
                await this.postgres.query('SELECT 1');
                services.postgres = true;
            }
            if (this.mongodb) {
                await this.mongodb.admin().ping();
                services.mongodb = true;
            }
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
        }
        catch (error) {
            return {
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
                services,
            };
        }
    }
    async close() {
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
        }
        catch (error) {
            console.error('Error closing database connections:', error);
            throw error;
        }
    }
    async getPostgresClient() {
        if (!this.postgres) {
            throw new Error('PostgreSQL not initialized');
        }
        return this.postgres.connect();
    }
    async executeQuery(query, params = []) {
        if (!this.postgres) {
            throw new Error('PostgreSQL not initialized');
        }
        try {
            const result = await this.postgres.query(query, params);
            return {
                rows: result.rows,
                rowCount: result.rowCount
            };
        }
        catch (error) {
            console.error('Query execution error:', error);
            throw error;
        }
    }
}
exports.default = new DatabaseManager();
//# sourceMappingURL=database.js.map