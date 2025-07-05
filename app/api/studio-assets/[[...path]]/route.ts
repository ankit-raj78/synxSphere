import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    let pathname = url.pathname.replace('/api/studio-assets', '')
    
    // Handle legacy font paths - if requesting /fonts/ directly, serve from studio assets
    if (pathname.startsWith('/fonts/')) {
      // This is already the correct path
    } else if (pathname === '' || pathname === '/') {
      // Default to index-iframe.html if no path specified
      pathname = '/index-iframe.html'
    }
    
    const fullPath = join(process.cwd(), 'public', 'studio', pathname)
    
    const content = await readFile(fullPath)
    
    // Determine content type
    let contentType = 'text/html'
    if (pathname.endsWith('.js')) {
      contentType = 'application/javascript'
    } else if (pathname.endsWith('.css')) {
      contentType = 'text/css'
    } else if (pathname.endsWith('.png')) {
      contentType = 'image/png'
    } else if (pathname.endsWith('.svg')) {
      contentType = 'image/svg+xml'
    } else if (pathname.endsWith('.json')) {
      contentType = 'application/json'
    } else if (pathname.endsWith('.woff2')) {
      contentType = 'font/woff2'
    } else if (pathname.endsWith('.woff')) {
      contentType = 'font/woff'
    } else if (pathname.endsWith('.ttf')) {
      contentType = 'font/ttf'
    } else if (pathname.endsWith('.otf')) {
      contentType = 'font/otf'
    } else if (pathname.endsWith('.eot')) {
      contentType = 'application/vnd.ms-fontobject'
    } else if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) {
      contentType = 'image/jpeg'
    } else if (pathname.endsWith('.gif')) {
      contentType = 'image/gif'
    } else if (pathname.endsWith('.webp')) {
      contentType = 'image/webp'
    } else if (pathname.endsWith('.mp3')) {
      contentType = 'audio/mpeg'
    } else if (pathname.endsWith('.wav')) {
      contentType = 'audio/wav'
    } else if (pathname.endsWith('.ogg')) {
      contentType = 'audio/ogg'
    }
    
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'X-Frame-Options': 'SAMEORIGIN',
        'Cache-Control': 'public, max-age=3600',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    })
  } catch (error) {
    console.error('Error serving studio file:', error)
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
