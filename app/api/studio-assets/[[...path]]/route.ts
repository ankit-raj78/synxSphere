import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    let pathname = url.pathname.replace('/api/studio-assets', '')
    
    // Log requests for debugging
    console.log(`Studio assets request: ${pathname || '/'} (original: ${url.pathname})`)
    
    // Handle legacy font paths - if requesting /fonts/ directly, serve from studio assets
    if (pathname.startsWith('/fonts/')) {
      // This is already the correct path
    } else if (pathname === '' || pathname === '/') {
      // Default to index-iframe.html if no path specified
      pathname = '/index-iframe.html'
    }
    
    const fullPath = join(process.cwd(), 'public', 'studio', pathname)
    
    let content: Buffer
    let actualPath = pathname
    
    try {
      content = await readFile(fullPath)
    } catch (error) {
      // If the file doesn't exist, check if it's a client-side route
      // For SPA routing, serve the main HTML file for non-asset requests
      if (!pathname.includes('.') || pathname.endsWith('/')) {
        actualPath = '/index-iframe.html'
        const fallbackPath = join(process.cwd(), 'public', 'studio', actualPath)
        content = await readFile(fallbackPath)
      } else {
        throw error
      }
    }
    
    // Determine content type
    let contentType = 'text/html'
    if (actualPath.endsWith('.js')) {
      contentType = 'application/javascript'
    } else if (actualPath.endsWith('.css')) {
      contentType = 'text/css'
    } else if (actualPath.endsWith('.png')) {
      contentType = 'image/png'
    } else if (actualPath.endsWith('.svg')) {
      contentType = 'image/svg+xml'
    } else if (actualPath.endsWith('.json')) {
      contentType = 'application/json'
    } else if (actualPath.endsWith('.woff2')) {
      contentType = 'font/woff2'
    } else if (actualPath.endsWith('.woff')) {
      contentType = 'font/woff'
    } else if (actualPath.endsWith('.ttf')) {
      contentType = 'font/ttf'
    } else if (actualPath.endsWith('.otf')) {
      contentType = 'font/otf'
    } else if (actualPath.endsWith('.eot')) {
      contentType = 'application/vnd.ms-fontobject'
    } else if (actualPath.endsWith('.jpg') || actualPath.endsWith('.jpeg')) {
      contentType = 'image/jpeg'
    } else if (actualPath.endsWith('.gif')) {
      contentType = 'image/gif'
    } else if (actualPath.endsWith('.webp')) {
      contentType = 'image/webp'
    } else if (actualPath.endsWith('.mp3')) {
      contentType = 'audio/mpeg'
    } else if (actualPath.endsWith('.wav')) {
      contentType = 'audio/wav'
    } else if (actualPath.endsWith('.ogg')) {
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
