import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// TODO: implement auth guard using @supabase/ssr once login flow is ready.
// The previous guard checked for 'sb-access-token', but supabase-js stores
// sessions in localStorage (not cookies), so the check always failed.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/staff/:path*'],
}
