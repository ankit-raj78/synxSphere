import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const pathname = url.pathname.replace('/api/fonts', '')
    
    // Remove leading slash if present
    const fontPath = pathname.startsWith('/') ? pathname.slice(1) : pathname
    
    const fullPath = join(process.cwd(), 'public', 'studio', 'fonts', fontPath)
    
    const content = await readFile(fullPath)
    
    // Determine content type for fonts
    let contentType = 'application/octet-stream'
    if (fontPath.endsWith('.woff2')) {
      contentType = 'font/woff2'
    } else if (fontPath.endsWith('.woff')) {
      contentType = 'font/woff'
    } else if (fontPath.endsWith('.ttf')) {
      contentType = 'font/ttf'
    } else if (fontPath.endsWith('.otf')) {
      contentType = 'font/otf'
    } else if (fontPath.endsWith('.eot')) {
      contentType = 'application/vnd.ms-fontobject'
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
    console.error('Error serving font file:', error)
    return NextResponse.json({ error: 'Font file not found' }, { status: 404 })
  }
}
