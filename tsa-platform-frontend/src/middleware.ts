import { NextRequest, NextResponse } from 'next/server'

// Define protected and public routes
const protectedRoutes = ['/coach', '/parent', '/dashboard']
const lockedRoutes = ['/coach/registrations', '/coach/legal']
const publicRoutes = ['/login', '/verify', '/', '/interest-form', '/event-interest-form']

// Routes that should redirect authenticated users
const authRoutes = ['/login', '/verify']

/**
 * Check if route is protected
 */
function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
}

/**
 * Check if route is public
 */
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  ) || pathname.startsWith('/api/') || 
      pathname.startsWith('/_next/') || 
      pathname.startsWith('/favicon') ||
      pathname.startsWith('/images') ||
      pathname.startsWith('/static')
}

/**
 * Check if route is an auth route
 */
function isAuthRoute(pathname: string): boolean {
  return authRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
}

/**
 * Check if route is locked (requires special access)
 */
function isLockedRoute(pathname: string): boolean {
  return lockedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
}

/**
 * Get required role for a route
 */
function getRequiredRole(pathname: string): string | null {
  if (pathname.startsWith('/coach')) return 'coach'
  if (pathname.startsWith('/parent') || pathname.startsWith('/dashboard')) return 'parent'
  return null
}

// Enable middleware with locked route protection
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if this is a locked route
  if (isLockedRoute(pathname)) {
    // For now, redirect to a "coming soon" or "access restricted" page
    // You can customize this logic based on your requirements
    const restrictedUrl = new URL('/coach', request.url)
    restrictedUrl.searchParams.set('locked', 'true')
    restrictedUrl.searchParams.set('route', pathname)
    return NextResponse.redirect(restrictedUrl)
  }
  
  // Skip all other middleware logic for now (can be enabled later)
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