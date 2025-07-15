import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

// This route serves dynamic content and should not be statically generated
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const fullPath = join(process.cwd(), 'public', 'studio', 'index-iframe.html')
    const content = await readFile(fullPath, 'utf-8')
    
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'X-Frame-Options': 'SAMEORIGIN',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error serving studio page:', error)
    return NextResponse.json({ error: 'Studio not found' }, { status: 404 })
  }
}
