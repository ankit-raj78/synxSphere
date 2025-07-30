import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle CORS for API routes
  if (pathname.startsWith('/api/')) {
    // Get the origin from the request
    const origin = request.headers.get('origin') || 'https://localhost:8080'
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-project-id, x-room-id',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        }
      })
    }

    // For non-preflight requests, add CORS headers
    const response = NextResponse.next()
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-project-id, x-room-id')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    return response
  }

  // If this is a request for an asset that should be served by studio-assets
  if (pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|otf|eot|ico)$/) && 
      !pathname.startsWith('/api/') && 
      !pathname.startsWith('/_next/')) {
    
    // Check if this asset exists in the studio directory
    const studioAssetPath = `/api/studio-assets${pathname}`
    
    // Redirect to the studio assets API
    const url = request.nextUrl.clone()
    url.pathname = studioAssetPath
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths including API routes for CORS handling
     * Exclude only:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
