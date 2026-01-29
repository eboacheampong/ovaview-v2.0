import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicPaths = ['/login', '/api/auth/login']
const adminOnlyPaths = ['/users', '/clients', '/client-users', '/logs']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('ovaview_token')?.value

  // Allow public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    // Redirect to dashboard if already authenticated
    if (token && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Check authentication for protected routes
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based access control
  // Note: Full role checking requires decoding the JWT token
  // For now, we'll handle this on the client side with the auth store
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}