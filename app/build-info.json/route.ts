import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

// This route serves dynamic content and should not be statically generated
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const fullPath = join(process.cwd(), 'public', 'studio', 'build-info.json')
    
    let content: string
    try {
      content = await readFile(fullPath, 'utf-8')
    } catch (error) {
      // Fallback content if file doesn't exist
      const fallbackContent = {
        version: "1.0.0",
        buildTime: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        commit: "unknown",
        features: {
          audio: true,
          collaboration: true,
          midi: true
        }
      }
      content = JSON.stringify(fallbackContent, null, 2)
    }
    
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Error serving build-info.json:', error)
    return NextResponse.json({ error: 'Build info not found' }, { status: 404 })
  }
}
