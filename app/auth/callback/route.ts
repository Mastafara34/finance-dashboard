// app/auth/callback/route.ts
// Handle redirect setelah user klik link konfirmasi email
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get('code');
  const next  = searchParams.get('next') ?? '/dashboard';
  const error = searchParams.get('error');

  // Handle error dari Supabase (misal: link expired)
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(searchParams.get('error_description') ?? error)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Fallback ke login dengan pesan error
  return NextResponse.redirect(`${origin}/login?error=Link+tidak+valid+atau+sudah+kadaluarsa`);
}
