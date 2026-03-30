import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC = ['/login', '/family/login', '/auth/callback', '/api/', '/_next/', '/favicon.ico', '/manifest', '/icon', '/icons/', '/characters/', '/animations/']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Check for Supabase auth cookie
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return NextResponse.next() // dev without supabase

  const projectId = new URL(url).hostname.split('.')[0]
  const hasSession = request.cookies.getAll().some(
    (c) => c.name.startsWith(`sb-${projectId}-auth`)
  )

  if (hasSession) {
    return NextResponse.next()
  }

  // Not logged in → redirect to login
  if (pathname.startsWith('/family')) {
    return NextResponse.redirect(new URL('/family/login', request.url))
  }
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.json$).*)'],
}
