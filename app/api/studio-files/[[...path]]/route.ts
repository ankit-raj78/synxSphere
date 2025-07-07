import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const pathname = url.pathname.replace('/api/studio-files', '')
    
    // Default to index-iframe.html if no path specified
    const filePath = pathname === '' || pathname === '/' ? '/index-iframe.html' : pathname
    
    const fullPath = join(process.cwd(), 'public', 'studio', filePath)
    
    const content = await readFile(fullPath)
    
    // Determine content type
    let contentType = 'text/html'
    if (filePath.endsWith('.js')) {
      contentType = 'application/javascript'
    } else if (filePath.endsWith('.css')) {
      contentType = 'text/css'
    } else if (filePath.endsWith('.png')) {
      contentType = 'image/png'
    } else if (filePath.endsWith('.svg')) {
      contentType = 'image/svg+xml'
    } else if (filePath.endsWith('.json')) {
      contentType = 'application/json'
    }
    
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error serving studio file:', error)
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
