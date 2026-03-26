// app/api/cron/test-report/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sesi habis, silakan login ulang.' }, { status: 401 });

    const { type } = await req.json();
    const { data: profile, error: dbError } = await supabase
      .from('users')
      .select('id, telegram_chat_id, display_name')
      .eq('id', user.id)
      .single();

    if (dbError || !profile) {
      return NextResponse.json({ error: 'Gagal ambil profil user di database.' }, { status: 404 });
    }

    if (!profile.telegram_chat_id) {
      return NextResponse.json({ error: 'ID Telegram belum terisi di profil Anda.' }, { status: 400 });
    }

    const testMsg = `🔧 *TEST NOTIFIKASI — ${type.toUpperCase()}*\n\nHalo ${profile.display_name}, ini adalah pesan uji coba untuk memastikan integrasi Telegram Anda aktif.\n\nJika Anda menerima pesan ini, sistem siap mengirimkan laporan ${type} secara otomatis.\n\n_Generated for testing purposes._`;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
       return NextResponse.json({ error: 'Server: TELEGRAM_BOT_TOKEN tidak ditemukan.' }, { status: 500 });
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: profile.telegram_chat_id, 
        text: testMsg, 
        parse_mode: 'Markdown' 
      })
    });

    if (!res.ok) {
        const errorDetail = await res.json();
        return NextResponse.json({ 
          error: `Telegram Error: ${errorDetail?.description || 'Gagal kirim pesan.'}` 
        }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[TEST_ERROR]', err);
    return NextResponse.json({ error: `System Error: ${err.message}` }, { status: 500 });
  }
}
