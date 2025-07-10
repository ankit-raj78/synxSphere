import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
