import { Pool, PoolClient } from 'pg';
import { GridFSBucket, Db } from 'mongodb';
import { RedisClientType } from 'redis';
import { HealthCheckResult } from '../types';
declare class DatabaseManager {
    postgres: Pool | null;
    mongodb: Db | null;
    redis: RedisClientType | null;
    gridFS: GridFSBucket | null;
    private mongoClient;
    initialize(): Promise<void>;
    healthCheck(): Promise<HealthCheckResult>;
    close(): Promise<void>;
    getPostgresClient(): Promise<PoolClient>;
    executeQuery<T = any>(query: string, params?: any[]): Promise<{
        rows: T[];
        rowCount: number | null;
    }>;
}
declare const _default: DatabaseManager;
export default _default;
//# sourceMappingURL=database.d.ts.map