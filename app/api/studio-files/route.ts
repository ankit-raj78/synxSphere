import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    // Read the iframe-friendly version of index.html
    const filePath = join(process.cwd(), 'public', 'studio', 'index-iframe.html')
    const content = await readFile(filePath, 'utf-8')
    
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error serving studio index:', error)
    return NextResponse.json({ error: 'Studio not found' }, { status: 404 })
  }
}
