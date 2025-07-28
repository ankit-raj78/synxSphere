import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'synxsphere-api'
  })
}

export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}
