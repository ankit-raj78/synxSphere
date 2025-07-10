import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

// Handle requests for studio assets that are being requested from the root
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const assetName = url.pathname.substring(1) // Remove leading slash
    
    // Try to serve the asset from the studio directory
    const fullPath = join(process.cwd(), 'public', 'studio', assetName)
    
    const content = await readFile(fullPath)
    
    // Determine content type
    let contentType = 'application/octet-stream'
    if (assetName.endsWith('.png')) {
      contentType = 'image/png'
    } else if (assetName.endsWith('.jpg') || assetName.endsWith('.jpeg')) {
      contentType = 'image/jpeg'
    } else if (assetName.endsWith('.gif')) {
      contentType = 'image/gif'
    } else if (assetName.endsWith('.svg')) {
      contentType = 'image/svg+xml'
    } else if (assetName.endsWith('.js')) {
      contentType = 'application/javascript'
    } else if (assetName.endsWith('.css')) {
      contentType = 'text/css'
    }
    
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    // If asset doesn't exist in studio directory, return 404
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
  }
}
