// middleware.ts — taruh di ROOT project (sejajar package.json)
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — PENTING: jangan hapus ini
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect ke /login kalau belum login dan akses halaman protected
  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/goals');
  const isAuthPage  = pathname === '/login';

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Kalau sudah login dan buka /login, redirect ke dashboard
  if (isAuthPage && user) {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = '/dashboard';
    return NextResponse.redirect(dashUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Jalankan middleware di semua path kecuali static files dan API
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
