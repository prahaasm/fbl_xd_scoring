import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'fbl_session';

function decodeSession(value: string | undefined): { username: string; role: string } | null {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = decodeSession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith('/dashboard')) {
    if (!session || session.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  const courtMatch = pathname.match(/^\/court\/(\d)/);
  if (courtMatch) {
    const allowedRole = `court${courtMatch[1]}`;
    if (!session || (session.role !== allowedRole && session.role !== 'admin')) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/court/:path*'],
};
