import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const pathname = url.pathname.replace('/assets', '')
    
    // Remove leading slash if present
    const assetPath = pathname.startsWith('/') ? pathname.slice(1) : pathname
    
    const fullPath = join(process.cwd(), 'public', 'studio', 'assets', assetPath)
    
    const content = await readFile(fullPath)
    
    // Determine content type for assets
    let contentType = 'application/javascript'
    if (assetPath.endsWith('.js')) {
      contentType = 'application/javascript'
    } else if (assetPath.endsWith('.css')) {
      contentType = 'text/css'
    } else if (assetPath.endsWith('.json')) {
      contentType = 'application/json'
    } else if (assetPath.endsWith('.map')) {
      contentType = 'application/json'
    } else if (assetPath.endsWith('.wasm')) {
      contentType = 'application/wasm'
    }
    
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Error serving asset file:', error)
    return NextResponse.json({ error: 'Asset file not found' }, { status: 404 })
  }
}
