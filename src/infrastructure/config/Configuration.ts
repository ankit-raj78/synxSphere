import { z } from 'zod';

/**
 * Configuration schema with validation using Zod
 */
const ConfigSchema = z.object({
  app: z.object({
    port: z.number().min(1).max(65535).default(3000),
    env: z.enum(['development', 'staging', 'production']).default('development'),
    name: z.string().default('synxsphere'),
    version: z.string().default('1.0.0'),
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info')
  }),

  database: z.object({
    postgres: z.object({
      url: z.string().url(),
      poolSize: z.number().min(1).max(100).default(20),
      connectionTimeout: z.number().default(10000)
    }),
    mongodb: z.object({
      url: z.string().url(),
      database: z.string().min(1),
      options: z.object({
        maxPoolSize: z.number().default(10),
        serverSelectionTimeoutMS: z.number().default(5000)
      }).optional()
    }).optional(),
    redis: z.object({
      url: z.string().url(),
      ttl: z.number().min(1).default(3600),
      maxRetries: z.number().default(3)
    }).optional()
  }),

  auth: z.object({
    jwtSecret: z.string().min(32, 'JWT secret must be at least 32 characters'),
    jwtExpiration: z.string().default('7d'),
    refreshTokenExpiration: z.string().default('30d'),
    bcryptRounds: z.number().min(8).max(15).default(12),
    maxLoginAttempts: z.number().default(5),
    lockoutDuration: z.number().default(900000) // 15 minutes
  }),

  audio: z.object({
    maxFileSize: z.number().min(1).default(104857600), // 100MB
    allowedFormats: z.array(z.string()).default(['mp3', 'wav', 'flac', 'm4a', 'ogg']),
    processingTimeout: z.number().default(300000), // 5 minutes
    storageProvider: z.enum(['local', 's3', 'gcs']).default('local'),
    storagePath: z.string().default('./uploads'),
    analysisService: z.object({
      enabled: z.boolean().default(true),
      provider: z.enum(['local', 'aws', 'azure']).default('local'),
      timeout: z.number().default(120000) // 2 minutes
    })
  }),

  websocket: z.object({
    pingInterval: z.number().min(1000).default(25000),
    pingTimeout: z.number().min(1000).default(60000),
    maxConnections: z.number().default(1000),
    cors: z.object({
      origins: z.array(z.string()).default(['http://localhost:3000']),
      credentials: z.boolean().default(true)
    })
  }),

  email: z.object({
    provider: z.enum(['smtp', 'sendgrid', 'ses']).default('smtp'),
    from: z.string().email(),
    smtp: z.object({
      host: z.string(),
      port: z.number().default(587),
      secure: z.boolean().default(false),
      auth: z.object({
        user: z.string(),
        pass: z.string()
      })
    }).optional()
  }).optional(),

  monitoring: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(['datadog', 'newrelic', 'prometheus']).optional(),
    apiKey: z.string().optional(),
    sampleRate: z.number().min(0).max(1).default(0.1)
  }).optional(),

  security: z.object({
    rateLimiting: z.object({
      windowMs: z.number().default(900000), // 15 minutes
      maxRequests: z.number().default(100),
      skipSuccessfulRequests: z.boolean().default(false)
    }),
    cors: z.object({
      origins: z.array(z.string()).default(['http://localhost:3000']),
      methods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE']),
      allowedHeaders: z.array(z.string()).default(['Content-Type', 'Authorization'])
    }),
    helmet: z.object({
      enabled: z.boolean().default(true),
      contentSecurityPolicy: z.boolean().default(true),
      crossOriginEmbedderPolicy: z.boolean().default(false)
    })
  })
});

export type AppConfig = z.infer<typeof ConfigSchema>;

/**
 * Centralized configuration management with validation
 */
export class Configuration {
  private static instance: Configuration;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadAndValidate();
  }

  /**
   * Load configuration from environment variables and validate
   */
  private loadAndValidate(): AppConfig {
    const rawConfig = {
      app: {
        port: this.getNumber('PORT', 3000),
        env: process.env.NODE_ENV || 'development',
        name: process.env.APP_NAME || 'synxsphere',
        version: process.env.npm_package_version || process.env.APP_VERSION || '1.0.0',
        logLevel: process.env.LOG_LEVEL || 'info'
      },

      database: {
        postgres: {
          url: this.getRequired('DATABASE_URL'),
          poolSize: this.getNumber('DB_POOL_SIZE', 20),
          connectionTimeout: this.getNumber('DB_CONNECTION_TIMEOUT', 10000)
        },
        ...(process.env.MONGODB_URL && {
          mongodb: {
            url: process.env.MONGODB_URL,
            database: this.getRequired('MONGODB_DATABASE'),
            options: {
              maxPoolSize: this.getNumber('MONGODB_POOL_SIZE', 10),
              serverSelectionTimeoutMS: this.getNumber('MONGODB_TIMEOUT', 5000)
            }
          }
        }),
        ...(process.env.REDIS_URL && {
          redis: {
            url: process.env.REDIS_URL,
            ttl: this.getNumber('REDIS_TTL', 3600),
            maxRetries: this.getNumber('REDIS_MAX_RETRIES', 3)
          }
        })
      },

      auth: {
        jwtSecret: this.getRequired('JWT_SECRET'),
        jwtExpiration: process.env.JWT_EXPIRATION || '7d',
        refreshTokenExpiration: process.env.REFRESH_TOKEN_EXPIRATION || '30d',
        bcryptRounds: this.getNumber('BCRYPT_ROUNDS', 12),
        maxLoginAttempts: this.getNumber('MAX_LOGIN_ATTEMPTS', 5),
        lockoutDuration: this.getNumber('LOCKOUT_DURATION', 900000)
      },

      audio: {
        maxFileSize: this.getNumber('AUDIO_MAX_FILE_SIZE', 104857600),
        allowedFormats: this.getArray('AUDIO_ALLOWED_FORMATS', ['mp3', 'wav', 'flac', 'm4a', 'ogg']),
        processingTimeout: this.getNumber('AUDIO_PROCESSING_TIMEOUT', 300000),
        storageProvider: process.env.AUDIO_STORAGE_PROVIDER || 'local',
        storagePath: process.env.AUDIO_STORAGE_PATH || './uploads',
        analysisService: {
          enabled: this.getBoolean('AUDIO_ANALYSIS_ENABLED', true),
          provider: process.env.AUDIO_ANALYSIS_PROVIDER || 'local',
          timeout: this.getNumber('AUDIO_ANALYSIS_TIMEOUT', 120000)
        }
      },

      websocket: {
        pingInterval: this.getNumber('WS_PING_INTERVAL', 25000),
        pingTimeout: this.getNumber('WS_PING_TIMEOUT', 60000),
        maxConnections: this.getNumber('WS_MAX_CONNECTIONS', 1000),
        cors: {
          origins: this.getArray('WS_CORS_ORIGINS', ['http://localhost:3000']),
          credentials: this.getBoolean('WS_CORS_CREDENTIALS', true)
        }
      },

      ...(process.env.EMAIL_FROM && {
        email: {
          provider: process.env.EMAIL_PROVIDER || 'smtp',
          from: process.env.EMAIL_FROM,
          ...(process.env.SMTP_HOST && {
            smtp: {
              host: process.env.SMTP_HOST,
              port: this.getNumber('SMTP_PORT', 587),
              secure: this.getBoolean('SMTP_SECURE', false),
              auth: {
                user: this.getRequired('SMTP_USER'),
                pass: this.getRequired('SMTP_PASS')
              }
            }
          })
        }
      }),

      ...(process.env.MONITORING_ENABLED && {
        monitoring: {
          enabled: this.getBoolean('MONITORING_ENABLED', false),
          provider: process.env.MONITORING_PROVIDER,
          apiKey: process.env.MONITORING_API_KEY,
          sampleRate: this.getNumber('MONITORING_SAMPLE_RATE', 0.1)
        }
      }),

      security: {
        rateLimiting: {
          windowMs: this.getNumber('RATE_LIMIT_WINDOW_MS', 900000),
          maxRequests: this.getNumber('RATE_LIMIT_MAX_REQUESTS', 100),
          skipSuccessfulRequests: this.getBoolean('RATE_LIMIT_SKIP_SUCCESS', false)
        },
        cors: {
          origins: this.getArray('CORS_ORIGINS', ['http://localhost:3000']),
          methods: this.getArray('CORS_METHODS', ['GET', 'POST', 'PUT', 'DELETE']),
          allowedHeaders: this.getArray('CORS_HEADERS', ['Content-Type', 'Authorization'])
        },
        helmet: {
          enabled: this.getBoolean('HELMET_ENABLED', true),
          contentSecurityPolicy: this.getBoolean('HELMET_CSP', true),
          crossOriginEmbedderPolicy: this.getBoolean('HELMET_COEP', false)
        }
      }
    };

    try {
      return ConfigSchema.parse(rawConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.issues.map((err: any) => 
          `${err.path.join('.')}: ${err.message}`
        ).join('\n');
        
        throw new Error(`Configuration validation failed:\n${formattedErrors}`);
      }
      throw error;
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): Configuration {
    if (!Configuration.instance) {
      Configuration.instance = new Configuration();
    }
    return Configuration.instance;
  }

  /**
   * Get configuration section
   */
  public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  /**
   * Get nested configuration value
   */
  public getNestedValue<T>(path: string): T {
    return path.split('.').reduce((obj: any, key) => obj?.[key], this.config) as T;
  }

  /**
   * Check if running in development mode
   */
  public isDevelopment(): boolean {
    return this.config.app.env === 'development';
  }

  /**
   * Check if running in production mode
   */
  public isProduction(): boolean {
    return this.config.app.env === 'production';
  }

  /**
   * Get all configuration (for debugging - don't log in production)
   */
  public getAll(): AppConfig {
    if (this.isProduction()) {
      throw new Error('Cannot access full configuration in production');
    }
    return { ...this.config };
  }

  /**
   * Helper methods for environment variable parsing
   */
  private getRequired(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  private getNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) return defaultValue;
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw new Error(`Environment variable ${key} must be a number, got: ${value}`);
    }
    return num;
  }

  private getBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  private getArray(key: string, defaultValue: string[]): string[] {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.split(',').map(item => item.trim());
  }

  /**
   * Validate configuration at runtime
   */
  public validate(): void {
    ConfigSchema.parse(this.config);
  }
}

// Export singleton instance
export const config = Configuration.getInstance();
