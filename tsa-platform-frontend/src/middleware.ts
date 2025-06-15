import { NextRequest, NextResponse } from 'next/server'

// Define protected and public routes
const protectedRoutes = ['/coach', '/parent', '/dashboard']
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
 * Get required role for a route
 */
function getRequiredRole(pathname: string): string | null {
  if (pathname.startsWith('/coach')) return 'coach'
  if (pathname.startsWith('/parent') || pathname.startsWith('/dashboard')) return 'parent'
  return null
}

// Temporarily disabled middleware for testing
export async function middleware(request: NextRequest) {
  // Skip all middleware logic for now
  return NextResponse.next()
}

export const config = {
  matcher: [],
} 