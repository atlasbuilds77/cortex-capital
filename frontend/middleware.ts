import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/onboarding',
  '/settings',
  '/fishtank',
]

// Routes that should redirect to dashboard if already authenticated
const authRoutes = [
  '/login',
  '/signup',
]

export function middleware(request: NextRequest) {
  // Check for token in cookie (middleware can't read localStorage, 
  // so actual auth enforcement happens client-side via ProtectedRoute)
  const token = request.cookies.get('cortex_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')

  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  
  const isAuthRoute = authRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Redirect to login if trying to access protected route without token
  // Note: primary auth enforcement is in ProtectedRoute (client-side, reads localStorage)
  if (isProtectedRoute && !token) {
    // Allow through — ProtectedRoute handles the redirect client-side
    // This avoids issues where token is in localStorage but not in cookies
  }

  // Redirect to dashboard if trying to access auth routes with valid cookie token
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
