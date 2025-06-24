
import { NextRequest, NextResponse } from 'next/server';
import getConfig from 'next/config';

export async function GET(request: NextRequest) {
  console.log('🔧 Debug: Raw environment variables:', {
    DATABASE_URL: process.env.DATABASE_URL,
    POSTGRES_HOST: process.env.POSTGRES_HOST,
    POSTGRES_PORT: process.env.POSTGRES_PORT,
    POSTGRES_DB: process.env.POSTGRES_DB,
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ? '[HIDDEN]' : undefined,
    NODE_ENV: process.env.NODE_ENV,
  });

  // Try to get Next.js runtime config
  let serverRuntimeConfig = {};
  let publicRuntimeConfig = {};
  try {
    const { serverRuntimeConfig: sRC, publicRuntimeConfig: pRC } = getConfig();
    serverRuntimeConfig = sRC || {};
    publicRuntimeConfig = pRC || {};
  } catch (error) {
    console.log('⚠️  Could not access Next.js runtime config:', error);
  }

  const envVars = {
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
    DATABASE_URL_VALUE: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'NOT SET',
    POSTGRES_HOST: process.env.POSTGRES_HOST || 'NOT SET',
    POSTGRES_PORT: process.env.POSTGRES_PORT || 'NOT SET',
    POSTGRES_DB: process.env.POSTGRES_DB || 'NOT SET',
    POSTGRES_USER: process.env.POSTGRES_USER || 'NOT SET',
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    PROCESS_ENV_KEYS: Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('POSTGRES')),
    SERVER_RUNTIME_CONFIG: serverRuntimeConfig,
    PUBLIC_RUNTIME_CONFIG: publicRuntimeConfig,
    ALL_ENV_KEYS: Object.keys(process.env).length,
    SAMPLE_ENV_KEYS: Object.keys(process.env).slice(0, 10),
  };

  return NextResponse.json(envVars);
}
