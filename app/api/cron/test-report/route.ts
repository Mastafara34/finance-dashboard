// app/api/cron/test-report/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type } = await req.json();
  const { data: profile } = await supabase.from('users').select('id, telegram_chat_id, display_name').eq('id', user.id).single();

  if (!profile || !profile.telegram_chat_id) {
    return NextResponse.json({ error: 'Telegram ID tidak ditemukan' }, { status: 400 });
  }

  const baseUrl = new URL(req.url).origin;
  const cronSecret = process.env.CRON_SECRET;

  // Tentukan URL tujuan berdasarkan tipe
  let targetUrl = '';
  if (type === 'weekly')  targetUrl = `${baseUrl}/api/cron/weekly-report`;
  if (type === 'monthly') targetUrl = `${baseUrl}/api/cron/monthly-report`;
  if (type === 'ai')      targetUrl = `${baseUrl}/api/cron/weekly-report`; // AI biasanya nempel di weekly
  if (type === 'reminder') targetUrl = `${baseUrl}/api/cron/daily-reminder`;

  // Catatan: Karena route cron mem-fetch SEMUA user, kita mungkin tidak bisa
  // mengetes HANYA untuk satu user tanpa me-refactor route cron tersebut.
  // Namun, kita bisa mengirim pesan dummy mandiri di sini untuk simulasi TEST.

  const testMsg = `🔧 *TEST NOTIFIKASI — ${type.toUpperCase()}*\n\nHalo ${profile.display_name}, ini adalah pesan uji coba untuk memastikan integrasi Telegram Anda aktif.\n\nJika Anda menerima pesan ini, sistem siap mengirimkan laporan ${type} secara otomatis.\n\n_Generated for testing purposes._`;

  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: profile.telegram_chat_id, text: testMsg, parse_mode: 'Markdown' })
  });

  if (!res.ok) return NextResponse.json({ error: 'Gagal kirim pesan test' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
