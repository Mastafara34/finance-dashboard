// app/api/cron/test-report/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

const adminSupabase = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sesi habis, silakan login ulang.' }, { status: 401 });

    const body = await req.json();
    const { type } = body;

    // Prioritas 1: chatId dikirim langsung dari UI (form input)
    let chatId: number | null = body.chatId ? Number(body.chatId) : null;
    let displayName = user.email ?? 'User';

    // Prioritas 2: ambil dari database users
    if (!chatId) {
      const { data: profile } = await adminSupabase
        .from('users')
        .select('telegram_chat_id, display_name')
        .eq('id', user.id)
        .maybeSingle();

      chatId = profile?.telegram_chat_id ?? null;
      displayName = profile?.display_name ?? displayName;
    }

    // Prioritas 3: cari dari tabel whitelisted_users berdasarkan chat_id yang cocok dengan user
    if (!chatId) {
      const { data: wlList } = await adminSupabase
        .from('whitelisted_users')
        .select('chat_id, username')
        .eq('is_active', true);

      const emailPrefix = user.email?.split('@')[0]?.toLowerCase() ?? '';
      const match = wlList?.find(w =>
        w.username?.toLowerCase() === emailPrefix ||
        w.username?.toLowerCase().includes(emailPrefix)
      );
      chatId = match?.chat_id ?? null;
    }

    if (!chatId) {
      return NextResponse.json({
        error: 'Chat ID tidak ditemukan. Isi nomor Chat ID Anda di kolom "🔗 Link Akun Telegram" lalu klik TEST lagi.'
      }, { status: 400 });
    }

    const typeLabels: Record<string, string> = {
      weekly: 'Laporan Mingguan',
      monthly: 'Tinjauan Bulanan',
      ai: 'Vonis Strategis AI',
      reminder: 'Pengingat Tidak Isi',
      budget: 'Peringatan Anggaran',
      anomaly: 'Deteksi Anomali',
      forecast: 'Prediksi Defisit',
    };

    const label = typeLabels[type] ?? type;
    const testMsg =
      `🔧 *TEST — ${label.toUpperCase()}*\n\n` +
      `Halo *${displayName}*, notifikasi *${label}* berhasil!\n\n` +
      `Sistem siap mengirimkan laporan ini secara otomatis sesuai jadwal.\n\n` +
      `_Elite Wealth Management • Test Message_`;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Server: TELEGRAM_BOT_TOKEN tidak dikonfigurasi.' }, { status: 500 });
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: testMsg, parse_mode: 'Markdown' })
    });

    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      return NextResponse.json({
        error: `Telegram Error: ${detail?.description ?? 'Gagal kirim pesan ke Telegram.'}`
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[TEST_NOTIF_ERROR]', err);
    return NextResponse.json({ error: `System Error: ${err.message}` }, { status: 500 });
  }
}
