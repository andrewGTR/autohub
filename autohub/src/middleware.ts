import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('autohub_token')?.value;
  const role  = request.cookies.get('autohub_role')?.value;
  const path  = request.nextUrl.pathname;

  // ── Route classifications ─────────────────────────────────

  /** Any authenticated user (user OR dealer) */
  const isProtectedRoute =
    path.startsWith('/profile') ||
    path.startsWith('/user-profile');  // ← was missing before

  /** Dealer-only pages */
  const isDealerRoute =
    path.startsWith('/dealer-profile') ||
    path.startsWith('/sell-car');

  /** Admin-only pages */
  const isAdminRoute = path.startsWith('/admin');

  /** Auth-only pages — redirect away if already logged in */
  const isAuthRoute =
    path === '/login' ||
    path === '/signup' ||
    path === '/dealer-signup';

  // ── Guards ────────────────────────────────────────────────

  // Logged-in users don't need to see login/signup
  if (isAuthRoute && token) {
    const dest = role === 'admin' ? '/admin' : role === 'dealer' ? '/dealer-profile' : '/';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Unauthenticated users can't access protected pages
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Only dealers may access dealer-specific pages
  if (isDealerRoute && role !== 'dealer') {
    const dest = token ? '/' : '/login';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Only admins may access admin pages
  if (isAdminRoute && role !== 'admin') {
    const dest = token ? '/' : '/login';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Apply middleware to all routes EXCEPT:
     *   - Next.js internals (_next/*)
     *   - API routes (/api/*)
     *   - Static assets (favicon, icons, imgs)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|icons|imgs).*)',
  ],
};
