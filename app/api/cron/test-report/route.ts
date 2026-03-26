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

    const { type } = await req.json();

    // 1. Ambil profil dari tabel users
    const { data: profile } = await adminSupabase
      .from('users')
      .select('id, telegram_chat_id, display_name, email')
      .eq('id', user.id)
      .maybeSingle();

    // 2. Tentukan chat_id — prioritas: users table → whitelist table (by email)
    let chatId: number | null = profile?.telegram_chat_id ?? null;
    let displayName: string = profile?.display_name ?? user.email ?? 'User';

    if (!chatId && profile?.email) {
      const { data: wl } = await adminSupabase
        .from('whitelisted_users')
        .select('chat_id')
        .eq('username', profile.email.split('@')[0])
        .maybeSingle();
      chatId = wl?.chat_id ?? null;
    }

    // 3. Jika masih tidak ada, coba cari dari email di whitelist
    if (!chatId) {
      const { data: wlAll } = await adminSupabase
        .from('whitelisted_users')
        .select('chat_id, username')
        .eq('is_active', true)
        .limit(10);

      // Cocokkan dengan email user (username Telegram biasanya nama depan atau email prefix)
      const emailPrefix = (user.email ?? '').split('@')[0].toLowerCase();
      const match = wlAll?.find(w =>
        w.username?.toLowerCase() === emailPrefix ||
        w.username?.toLowerCase().includes(emailPrefix)
      );
      chatId = match?.chat_id ?? null;
    }

    if (!chatId) {
      return NextResponse.json({
        error: 'Telegram ID tidak ditemukan. Pastikan Anda sudah pernah mengirim pesan ke Bot Telegram Anda, atau isi Chat ID secara manual di kolom "Link Akun Telegram" di Pengaturan.'
      }, { status: 400 });
    }

    // 4. Jika ditemukan via whitelist, update users table supaya kedepannya langsung ketemu
    if (!profile?.telegram_chat_id && chatId) {
      await adminSupabase
        .from('users')
        .update({ telegram_chat_id: chatId })
        .eq('id', user.id);
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

    const testMsg =
      `🔧 *TEST NOTIFIKASI — ${(typeLabels[type] ?? type).toUpperCase()}*\n\n` +
      `Halo ${displayName}, ini adalah pesan uji coba untuk memastikan notifikasi *${typeLabels[type] ?? type}* aktif.\n\n` +
      `Jika Anda menerima pesan ini, sistem siap mengirimkan laporan secara otomatis.\n\n` +
      `_Generated for testing purposes._`;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Server: TELEGRAM_BOT_TOKEN tidak ditemukan.' }, { status: 500 });
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: testMsg, parse_mode: 'Markdown' })
    });

    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      return NextResponse.json({
        error: `Telegram Error: ${detail?.description ?? 'Gagal kirim pesan.'}`
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[TEST_ERROR]', err);
    return NextResponse.json({ error: `System Error: ${err.message}` }, { status: 500 });
  }
}
