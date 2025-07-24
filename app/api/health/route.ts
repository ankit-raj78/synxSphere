import { NextRequest, NextResponse } from 'next/server'

// CORS headers for OpenDAW Studio integration
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://localhost:8080',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
}

// Handle preflight OPTIONS request
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

// Handle HEAD request (used by OpenDAW to check API availability)
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

// Handle GET request for health check
export async function GET() {
  return NextResponse.json(
    { 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'SynxSphere API'
    },
    { 
      headers: corsHeaders 
    }
  )
}
