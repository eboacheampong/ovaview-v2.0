import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicPaths = ['/login', '/api/auth', '/media']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths and static files
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Allow all other routes - auth checking is done client-side
  // since we use localStorage for token storage
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
