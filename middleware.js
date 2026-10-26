import { NextResponse } from 'next/server';

// Everything except the login page and the machine-to-machine endpoints needs the dashboard password.
const PUBLIC = ['/login', '/api/telegram', '/api/cron/', '/api/render-callback', '/api/setup'];

async function expectedToken() {
  const data = new TextEncoder().encode(`${process.env.DASHBOARD_PASSWORD}:${process.env.SESSION_SECRET}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const cookie = request.cookies.get('cpwt_session')?.value;
  if (process.env.DASHBOARD_PASSWORD && cookie && cookie === (await expectedToken())) {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|sample/).*)'],
};
