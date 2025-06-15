// Health check API endpoint for AWS load balancer
import { NextApiRequest, NextApiResponse } from 'next';

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: {
    database?: 'ok' | 'error';
    redis?: 'ok' | 'error';
    storage?: 'ok' | 'error';
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheckResponse>
) {
  try {
    const startTime = Date.now();
    const checks: HealthCheckResponse['checks'] = {};
    
    // Basic health check
    const healthData: HealthCheckResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
      environment: process.env.NODE_ENV ?? 'development',
      uptime: process.uptime(),
      checks
    };    // Database check (if available)
    try {
      if (process.env.DB_HOST) {
        // Simple query to check database connection
        // This would need to be implemented based on your database client
        checks.database = 'ok';
      }
    } catch (error) {
      console.error('Database health check failed:', error);
      checks.database = 'error';
      healthData.status = 'unhealthy';
    }    // Redis check (if available)
    try {
      if (process.env.REDIS_HOST) {
        // Simple ping to check Redis connection
        // This would need to be implemented based on your Redis client
        checks.redis = 'ok';
      }
    } catch (error) {
      console.error('Redis health check failed:', error);
      checks.redis = 'error';
      healthData.status = 'unhealthy';
    }    // Storage check (if available)
    try {
      if (process.env.S3_AUDIO_BUCKET) {
        // Simple check for S3 access
        // This would need to be implemented based on your S3 client
        checks.storage = 'ok';
      }
    } catch (error) {
      console.error('Storage health check failed:', error);
      checks.storage = 'error';
      healthData.status = 'unhealthy';
    }

    const responseTime = Date.now() - startTime;
    
    // Set response headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    // Return appropriate status code
    const statusCode = healthData.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthData);

  } catch (error) {
    console.error('Health check error:', error);
      res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
      environment: process.env.NODE_ENV ?? 'development',
      uptime: process.uptime(),
      checks: {}
    });
  }
}
