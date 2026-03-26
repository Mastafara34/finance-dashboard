// app/api/cron/test-report/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

const adminSupabase = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sesi habis, silakan login ulang.' }, { status: 401 });

    const body = await req.json();
    const { type } = body;

    // Ambil profil dari database
    const { data: profile } = await adminSupabase
      .from('users')
      .select('telegram_chat_id, display_name')
      .eq('id', user.id)
      .maybeSingle();

    // Prioritas Chat ID: dari body (form input) → dari database
    let chatId: number | null = body.chatId ? Number(body.chatId) : (profile?.telegram_chat_id ?? null);

    // Fallback ke whitelist jika masih kosong
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
        error: 'Chat ID tidak ditemukan. Pastikan kolom "🔗 Link Akun Telegram" sudah terisi dengan Chat ID Anda.'
      }, { status: 400 });
    }

    // Nama tampil yang bersih (bukan email)
    const rawName = profile?.display_name ?? user.email ?? 'User';
    const name = rawName.includes('@') ? rawName.split('@')[0] : rawName.split(' ')[0];

    // ── Pesan preview realistis per tipe ──────────────────────────────────────
    const messages: Record<string, string> = {
      weekly:
        `📊 *Laporan Keuangan Mingguan*\n` +
        `_Minggu ini (Preview Test)_\n\n` +
        `💚 Pemasukan    : *${fmt(3_500_000)}*\n` +
        `🔴 Pengeluaran  : *${fmt(2_100_000)}*\n` +
        `💰 Net Cash Flow: *${fmt(1_400_000)}*\n\n` +
        `📂 Pengeluaran Terbesar:\n` +
        `  1. Makanan & Minuman — ${fmt(750_000)}\n` +
        `  2. Transportasi — ${fmt(480_000)}\n` +
        `  3. Belanja — ${fmt(320_000)}\n\n` +
        `✅ Minggu yang baik, *${name}!* Tabungan terjaga.\n\n` +
        `_🔧 Ini adalah preview TEST. Laporan asli dikirim setiap Sabtu pagi._`,

      monthly:
        `📅 *Tinjauan Strategis Bulanan*\n` +
        `_Bulan ini (Preview Test)_\n\n` +
        `📈 Total Pemasukan  : *${fmt(12_000_000)}*\n` +
        `📉 Total Pengeluaran: *${fmt(8_750_000)}*\n` +
        `💎 Surplus Bersih   : *${fmt(3_250_000)}*\n` +
        `📊 Rasio Tabungan   : *27.1%*\n\n` +
        `🏆 *Vonis AI:* Keuangan bulan ini sehat.\n` +
        `Tingkatkan investasi rutin untuk akselerasi kekayaan.\n\n` +
        `_🔧 Ini adalah preview TEST. Laporan asli dikirim tiap tanggal 1._`,

      ai:
        `🤖 *Vonis Strategis AI — Elite Wealth Advisor*\n\n` +
        `Halo *${name}*, berikut analisis AI untuk pola keuangan Anda:\n\n` +
        `🔍 *Temuan Kritis:*\n` +
        `• Pengeluaran hiburan naik 40% dari bulan lalu\n` +
        `• Rasio tabungan masih di bawah target 30%\n` +
        `• Konsistensi input transaksi: Bagus ✅\n\n` +
        `💡 *Rekomendasi:*\n` +
        `Alokasikan minimal 10% dari surplus ke instrumen investasi bulan depan.\n\n` +
        `_🔧 Ini adalah preview TEST. Analisis AI dikirim otomatis setiap minggu._`,

      reminder:
        `👋 Halo *${name}!*\n\n` +
        `Kelihatannya kamu belum catat transaksi *3 hari* ini.\n\n` +
        `Langsung ketik aja — _"Makan siang 35rb"_ atau _"Bensin 100rb"_ — selesai dalam 5 detik! ⚡\n\n` +
        `_🔧 Ini adalah preview TEST. Pengingat dikirim otomatis setiap malam jika >2 hari kosong._`,

      budget:
        `⚠️ *Budget Kategori HAMPIR HABIS!*\n\n` +
        `📂 Kategori  : *Makanan & Minuman*\n` +
        `📊 Terpakai  : *85%* (${fmt(850_000)})\n` +
        `🎯 Limit     : ${fmt(1_000_000)}\n` +
        `📉 Sisa      : *${fmt(150_000)}*\n\n` +
        `_🔧 Ini adalah preview TEST. Peringatan asli dikirim real-time setiap kali Anda mencatat pengeluaran._`,

      anomaly:
        `🚨 *Anomali Pengeluaran Terdeteksi!*\n\n` +
        `📂 Kategori     : *Belanja*\n` +
        `💸 Transaksi ini: *${fmt(2_500_000)}*\n` +
        `📊 Rata-rata 30 hari: ${fmt(450_000)}\n` +
        `📈 Selisih      : *5.6× lebih besar* dari biasanya\n\n` +
        `_Ini hanya informasi — bukan kesalahan. Ketik /status untuk lihat konteks bulan ini._\n\n` +
        `_🔧 Ini adalah preview TEST. Deteksi asli berjalan real-time._`,

      forecast:
        `🔮 *Peringatan Forecast Defisit*\n\n` +
        `Halo ${name}, pola belanja saat ini diprediksi akan membuat pengeluaran bulan ini mencapai *${fmt(9_800_000)}*.\n\n` +
        `⚠️ Anda berisiko *defisit ${fmt(800_000)}* di akhir bulan.\n` +
        `Waktunya mengerem pengeluaran strategis Anda! 📉\n\n` +
        `_🔧 Ini adalah preview TEST. Analisis forecast dikirim otomatis setiap malam mulai tanggal 10._`,
    };

    const testMsg = messages[type] ?? `🔧 TEST notifikasi *${type}* berhasil!\n\n_Elite Wealth Management_`;

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
