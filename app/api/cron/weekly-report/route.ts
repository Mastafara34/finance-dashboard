/**
 * app/api/cron/weekly-report/route.ts
 * =====================================
 * Dijalankan otomatis oleh Vercel Cron setiap Sabtu 07:00 WIB (00:00 UTC).
 * Mengirim weekly summary ke semua user aktif via Telegram.
 *
 * Security: endpoint ini dilindungi CRON_SECRET header.
 * Vercel otomatis inject Authorization header saat memanggil cron.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  `Rp ${Math.round(n).toLocaleString('id-ID')}`;

const progressBar = (current: number, target: number, len = 8): string => {
  const pct = Math.min(current / target, 1);
  const filled = Math.round(pct * len);
  return '▓'.repeat(filled) + '░'.repeat(len - filled) + ` ${Math.round(pct * 100)}%`;
};

async function sendTelegram(chatId: number, text: string): Promise<void> {
  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Telegram error for chatId ${chatId}: ${JSON.stringify(err)}`);
  }
}

// ─── Report generator untuk satu user ────────────────────────────────────────
async function generateAndSendReport(user: {
  id: string;
  telegram_chat_id: number;
  display_name: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date();

    // Rentang waktu: 7 hari terakhir
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Rentang bulan ini (untuk goals & budget context)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];

    // ── 1. Transaksi 7 hari terakhir ─────────────────────────────────────────
    const { data: weekTxs } = await supabase
      .from('transactions')
      .select('amount, type, categories(name)')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .gte('date', weekStartStr);

    const txs = weekTxs ?? [];
    const weekIncome  = txs.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
    const weekExpense = txs.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);

    // ── 2. Top 3 kategori pengeluaran minggu ini ──────────────────────────────
    const catMap: Record<string, number> = {};
    txs
      .filter((t: any) => t.type === 'expense')
      .forEach((t: any) => {
        const cat = (t.categories as any)?.name ?? 'Lain-lain';
        catMap[cat] = (catMap[cat] ?? 0) + t.amount;
      });

    const topCats = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // ── 3. Perbandingan vs minggu lalu (anomaly sederhana) ───────────────────
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    const { data: prevTxs } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .gte('date', prevWeekStart.toISOString().split('T')[0])
      .lt('date', weekStartStr);

    const prevExpense = (prevTxs ?? [])
      .filter((t: any) => t.type === 'expense')
      .reduce((s: number, t: any) => s + t.amount, 0);

    let trendMsg = '';
    if (prevExpense > 0 && weekExpense > 0) {
      const diff = ((weekExpense - prevExpense) / prevExpense) * 100;
      if (diff > 20) {
        trendMsg = `\n⚠️ _Pengeluaran naik ${Math.round(diff)}% vs minggu lalu_`;
      } else if (diff < -20) {
        trendMsg = `\n✨ _Pengeluaran turun ${Math.round(Math.abs(diff))}% vs minggu lalu — bagus!_`;
      }
    }

    // ── 4. Goals aktif ────────────────────────────────────────────────────────
    const { data: goals } = await supabase
      .from('goals')
      .select('name, icon, current_amount, target_amount, monthly_allocation, deadline')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('priority', { ascending: true })
      .limit(3);

    // ── 5. Budget check bulan ini ─────────────────────────────────────────────
    const { data: budgets } = await supabase
      .from('monthly_budgets')
      .select('limit_amount, categories(name)')
      .eq('user_id', user.id)
      .eq('month', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

    // Pengeluaran bulan ini per kategori untuk cek budget
    const { data: monthTxs } = await supabase
      .from('transactions')
      .select('amount, categories(name)')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .eq('is_deleted', false)
      .gte('date', monthStart);

    const monthCatSpend: Record<string, number> = {};
    (monthTxs ?? []).forEach((t: any) => {
      const cat = (t.categories as any)?.name ?? 'Lain-lain';
      monthCatSpend[cat] = (monthCatSpend[cat] ?? 0) + t.amount;
    });

    // Budget yang sudah >80%
    const budgetAlerts = (budgets ?? [])
      .map((b: any) => {
        const catName = (b.categories as any)?.name ?? '';
        const spent = monthCatSpend[catName] ?? 0;
        const pct = b.limit_amount > 0 ? (spent / b.limit_amount) * 100 : 0;
        return { catName, spent, limit: b.limit_amount, pct };
      })
      .filter(b => b.pct >= 80)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 2);

    // ── 6. Insight AI (Gemini) ────────────────────────────────────────────────
    let aiInsight = '';
    if (txs.length >= 3) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const prompt = `Kamu adalah financial advisor yang berbicara dalam Bahasa Indonesia informal tapi profesional.
Berdasarkan data keuangan minggu ini:
- Total pengeluaran: ${fmt(weekExpense)}
- Total pemasukan: ${fmt(weekIncome)}
- Kategori terbesar: ${topCats.map(([c, a]) => `${c} (${fmt(a)})`).join(', ') || 'tidak ada'}
${prevExpense > 0 ? `- Pengeluaran minggu lalu: ${fmt(prevExpense)}` : ''}

Berikan SATU kalimat insight yang spesifik, actionable, dan tidak generik. 
Maksimal 100 karakter. Tanpa emoji. Tanpa tanda petik.`;

        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 100 },
          }),
        });

        const geminiData = await geminiRes.json();
        if (!geminiData.error) {
          const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          aiInsight = raw.trim().replace(/^["']|["']$/g, '').slice(0, 150);
        }
      } catch {
        // AI insight opsional — tidak perlu gagalkan seluruh report
      }
    }

    // ── 7. Susun pesan ────────────────────────────────────────────────────────
    const firstName = user.display_name?.split(' ')[0] ?? 'Kamu';
    const weekLabel = `${weekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    let msg = `📊 *Weekly Report — ${firstName}*\n`;
    msg += `_${weekLabel}_\n`;
    msg += `${'─'.repeat(28)}\n\n`;

    // Cashflow
    msg += `💚 Pemasukan     : *${fmt(weekIncome)}*\n`;
    msg += `🔴 Pengeluaran   : *${fmt(weekExpense)}*\n`;
    const balance = weekIncome - weekExpense;
    msg += `${balance >= 0 ? '💰' : '⚠️'} Saldo bersih  : *${fmt(Math.abs(balance))}*`;
    msg += balance < 0 ? ' _(defisit)_' : '';
    msg += trendMsg;
    msg += `\n`;

    // Top kategori
    if (topCats.length > 0) {
      msg += `\n📂 *Top pengeluaran:*\n`;
      topCats.forEach(([cat, amt], i) => {
        const pct = weekExpense > 0 ? Math.round((amt / weekExpense) * 100) : 0;
        msg += `${i + 1}. ${cat} — ${fmt(amt)} _(${pct}%)_\n`;
      });
    }

    // Budget alerts
    if (budgetAlerts.length > 0) {
      msg += `\n🔔 *Budget alert bulan ini:*\n`;
      budgetAlerts.forEach(b => {
        const icon = b.pct >= 100 ? '🚨' : '⚠️';
        msg += `${icon} ${b.catName}: ${Math.round(b.pct)}% terpakai\n`;
      });
    }

    // Goals
    if (goals && goals.length > 0) {
      msg += `\n🎯 *Progress goals:*\n`;
      (goals as any[]).forEach(g => {
        const bar = progressBar(g.current_amount, g.target_amount);
        const sisa = Math.max(0, g.target_amount - g.current_amount);
        msg += `${g.icon} *${g.name}*\n`;
        msg += `   ${bar}\n`;
        if (sisa > 0 && g.monthly_allocation) {
          const months = Math.ceil(sisa / g.monthly_allocation);
          msg += `   Sisa ${fmt(sisa)} · ~${months} bln\n`;
        }
      });
    }

    // AI Insight
    if (aiInsight) {
      msg += `\n💡 *Insight minggu ini:*\n`;
      msg += `_${aiInsight}_\n`;
    }

    msg += `\n${'─'.repeat(28)}\n`;
    msg += `_Ketik /status atau /goals untuk detail_`;

    // Kirim ke Telegram
    await sendTelegram(user.telegram_chat_id, msg);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  // ── Security: verifikasi Vercel Cron secret ──────────────────────────────
  // Vercel inject: Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET not set');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[CRON] Unauthorized attempt to trigger weekly report');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[CRON] Weekly report started:', new Date().toISOString());

  // ── Fetch semua user aktif yang punya telegram_chat_id ───────────────────
  const { data: users, error } = await supabase
    .from('users')
    .select('id, telegram_chat_id, display_name')
    .not('telegram_chat_id', 'is', null)
    .not('onboarded_at', 'is', null); // hanya user yang sudah selesai onboarding

  if (error) {
    console.error('[CRON] Failed to fetch users:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!users || users.length === 0) {
    console.log('[CRON] No users to report to');
    return NextResponse.json({ ok: true, sent: 0 });
  }

  // ── Kirim report ke setiap user ──────────────────────────────────────────
  // Sequential (bukan parallel) untuk hindari rate limit Telegram
  const results: { userId: string; success: boolean; error?: string }[] = [];

  for (const user of users) {
    const result = await generateAndSendReport(user as any);
    results.push({ userId: user.id, ...result });

    // Delay 300ms antar user untuk hindari Telegram rate limit (30 msg/detik)
    if (users.indexOf(user) < users.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failedCount  = results.filter(r => !r.success).length;

  console.log(`[CRON] Weekly report done: ${successCount} sent, ${failedCount} failed`);
  if (failedCount > 0) {
    console.error('[CRON] Failures:', results.filter(r => !r.success));
  }

  return NextResponse.json({
    ok: true,
    sent: successCount,
    failed: failedCount,
    timestamp: new Date().toISOString(),
  });
}
