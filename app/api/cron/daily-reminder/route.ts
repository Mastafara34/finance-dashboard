/**
 * app/api/cron/daily-reminder/route.ts
 * =======================================
 * Dijalankan setiap hari pukul 20:00 WIB (13:00 UTC).
 * Kirim reminder ke user yang belum input transaksi 2+ hari berturut-turut.
 *
 * Logika:
 *   - Cek transaksi terakhir tiap user
 *   - Kalau gap >= 2 hari → kirim reminder
 *   - Variasi pesan supaya tidak monoton (pilih random dari pool)
 *   - Tidak kirim kalau sudah ada transaksi hari ini
 *
 * Vercel Cron: "0 13 * * *" = setiap hari 13:00 UTC = 20:00 WIB
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Pesan reminder bervariasi ────────────────────────────────────────────────
// Dikelompokkan per durasi gap agar relevan
const MESSAGES_2_DAYS = [
  (name: string) =>
    `👋 Halo *${name}!*\n\nKelihatannya kamu belum catat transaksi 2 hari ini.\n\nLangsung ketik aja — _"Makan siang 35rb"_ atau _"Bensin 100rb"_ — selesai dalam 5 detik! ⚡`,
  (name: string) =>
    `📝 *${name},* jangan sampai lupa ya!\n\nData 2 hari ini belum tercatat. Semakin lama ditunda, semakin susah ingat detailnya.\n\nKetik transaksimu sekarang 👇`,
  (name: string) =>
    `💡 *Reminder kecil untuk ${name}:*\n\nBelum ada catatan 2 hari terakhir. Konsistensi adalah kunci — 5 detik input sekarang lebih baik dari lupa selamanya! 🎯`,
];

const MESSAGES_3_DAYS = [
  (name: string) =>
    `⚠️ *${name},* sudah 3 hari nih!\n\nData keuangan 3 hari terakhir kosong. Coba ingat-ingat tadi beli apa aja dan ketik sekarang — boleh beberapa sekaligus!\n\n_Contoh: "Makan siang 40rb, bensin 100rb, indomaret 25rb"_`,
  (name: string) =>
    `🔔 *Ceplas-ceplos reminder untuk ${name}:*\n\n3 hari kosong = data keuangan tidak akurat = keputusan finansial kurang tepat.\n\nYuk mulai lagi dari sekarang — tidak perlu input semua yang terlewat, cukup dari hari ini! 💪`,
];

const MESSAGES_5_PLUS_DAYS = [
  (name: string, days: number) =>
    `😅 *${name}...* ${days} hari sudah berlalu!\n\nSaya tidak mau menghakimi, tapi data ${days} hari terakhir kosong. \n\nKalau masih ingat beberapa transaksi besar, ketik sekarang. Kalau tidak, tidak apa-apa — mulai fresh dari hari ini! 🆕`,
  (name: string, days: number) =>
    `📊 *Update untuk ${name}:*\n\nBot sudah ${days} hari tidak mendengar kabarmu. Goals kamu masih menunggu update progress!\n\nKetik /goals untuk cek status, atau langsung catat transaksi hari ini. 🎯`,
];

function getRandomMessage(
  name: string,
  gapDays: number
): string {
  let pool: ((name: string, days?: number) => string)[];

  if (gapDays >= 5) {
    pool = MESSAGES_5_PLUS_DAYS;
  } else if (gapDays >= 3) {
    pool = MESSAGES_3_DAYS;
  } else {
    pool = MESSAGES_2_DAYS;
  }

  const fn = pool[Math.floor(Math.random() * pool.length)];
  return fn(name, gapDays);
}

// ─── Send Telegram ────────────────────────────────────────────────────────────
async function sendTelegram(chatId: number, text: string): Promise<void> {
  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    chatId,
        text,
        parse_mode: 'Markdown',
      }),
    }
  );
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[CRON] Daily reminder started:', new Date().toISOString());

  const today = new Date().toISOString().split('T')[0];

  // Fetch semua user aktif dengan telegram_chat_id
  const { data: users } = await supabase
    .from('users')
    .select('id, telegram_chat_id, display_name, onboarded_at')
    .not('telegram_chat_id', 'is', null)
    .not('onboarded_at', 'is', null);

  if (!users || users.length === 0) {
    return NextResponse.json({ ok: true, reminded: 0 });
  }

  let reminded = 0;
  let skipped  = 0;

  for (const user of users) {
    try {
      // Cari transaksi terakhir user ini
      const { data: lastTx } = await supabase
        .from('transactions')
        .select('date')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Kalau ada transaksi hari ini → skip
      if (lastTx?.date === today) {
        skipped++;
        continue;
      }

      // Hitung gap hari
      let gapDays: number;
      if (!lastTx) {
        // Belum pernah input sama sekali — hitung dari onboarded_at
        const onboardedDate = new Date(user.onboarded_at).toISOString().split('T')[0];
        gapDays = Math.floor(
          (new Date(today).getTime() - new Date(onboardedDate).getTime()) / 86400000
        );
      } else {
        gapDays = Math.floor(
          (new Date(today).getTime() - new Date(lastTx.date).getTime()) / 86400000
        );
      }

      // Hanya kirim kalau gap >= 2 hari
      if (gapDays < 2) {
        skipped++;
        continue;
      }

      // Cap reminder: jangan kirim kalau gap > 30 hari (mungkin sudah tidak aktif)
      if (gapDays > 30) {
        skipped++;
        continue;
      }

      const firstName = (user.display_name ?? 'Kamu').split(' ')[0];
      const msg       = getRandomMessage(firstName, gapDays);

      await sendTelegram(user.telegram_chat_id, msg);
      reminded++;

      // Delay 300ms antar user — Telegram rate limit
      if (users.indexOf(user) < users.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }

    } catch (err: any) {
      console.error(`[CRON] Failed to remind user ${user.id}:`, err.message);
    }
  }

  console.log(`[CRON] Daily reminder done: ${reminded} sent, ${skipped} skipped`);

  return NextResponse.json({
    ok: true,
    reminded,
    skipped,
    timestamp: new Date().toISOString(),
  });
}
