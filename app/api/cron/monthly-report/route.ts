// app/api/cron/monthly-report/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

const progressBar = (cur: number, tar: number, len = 8) => {
  const p = Math.min(cur / (tar || 1), 1);
  const f = Math.round(p * len);
  return '▓'.repeat(f) + '░'.repeat(len - f) + ` ${Math.round(p * 100)}%`;
};

async function sendTelegram(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
  });
}

async function generateMonthly(user: any) {
  try {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`;
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2,'0')}`;

    // 1. Data Bulan Ini
    const { data: txs } = await supabase.from('transactions').select('amount, type, categories(name)').eq('user_id', user.id).eq('is_deleted', false).like('date', `${monthStr}%`);
    const income = (txs as any[])?.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0) || 0;
    const expense = (txs as any[])?.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0) || 0;

    // 2. Data Bulan Lalu
    const { data: pTxs } = await supabase.from('transactions').select('amount, type').eq('user_id', user.id).eq('is_deleted', false).like('date', `${prevMonthStr}%`);
    const pExpense = (pTxs as any[])?.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0) || 0;

    // 3. Kategori
    const cats: Record<string, number> = {};
    (txs as any[])?.filter((t: any) => t.type === 'expense').forEach((t: any) => {
      const n = (t.categories as any)?.name || 'Lain-lain';
      cats[n] = (cats[n] || 0) + t.amount;
    });
    const topCats = Object.entries(cats).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);

    // 4. Goals
    const { data: goals } = await supabase.from('goals').select('name, current_amount, target_amount').eq('user_id', user.id).eq('status', 'active');

    // ── 5. AI Insight (Gemini) ────────────────────────────────────────────────
    let aiInsight = '';
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const prompt = `Kamu adalah financial advisor cerdas. Berikan analisis POLA belanja dari data bulanan berikut agar user tidak 'miss' tren buruknya.
- Income: ${fmt(income)}
- Expense: ${fmt(expense)}
- Kategori Top: ${topCats.map(([n, a]) => `${n} (${fmt(a)})`).join(', ')}
${pExpense > 0 ? `- Expense bulan lalu: ${fmt(pExpense)}` : ''}

Berikan SATU kalimat analisis tren pola belanja yang sangat tajam dan mendalam. Maksimal 140 karakter. Tanpa emoji. Tanpa tanda petik.`;

      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const gData = await res.json();
      aiInsight = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } catch (e) {
      console.warn('AI failed', e);
    }

    // Message
    const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    let msg = `📅 *LAPORAN BULANAN — ${user.display_name?.split(' ')[0]}*\n`;
    msg += `_${monthName}_\n`;
    msg += `──────────────────────────\n\n`;
    msg += `🟢 Pemasukan   : *${fmt(income)}*\n`;
    msg += `🔴 Pengeluaran : *${fmt(expense)}*\n`;
    msg += `💰 Surplus     : *${fmt(income - expense)}*\n\n`;

    if (pExpense > 0) {
      const diff = ((expense - pExpense) / pExpense) * 100;
      msg += diff > 0 
        ? `⚠️ _Pengeluaran naik ${Math.round(diff)}% dibanding bulan lalu._\n`
        : `✨ _Hemat ${Math.round(Math.abs(diff))}% dibanding bulan lalu!_\n`;
    }

    if (aiInsight) {
      msg += `\n🧠 *Analisis Pola Bulanan:*\n`;
      msg += `_${aiInsight}_\n`;
    }

    if (topCats.length > 0) {
      msg += `\n📦 *Top Pengeluaran:* \n`;
      topCats.forEach(([n, a], i) => msg += `${i+1}. ${n}: ${fmt(a)}\n`);
    }

    if (goals && goals.length > 0) {
      msg += `\n🎯 *Progres Goal Utama:* \n`;
      (goals as any[]).slice(0, 3).forEach(g => msg += `• ${g.name}\n  ${progressBar(g.current_amount, g.target_amount)}\n`);
    }

    msg += `\n──────────────────────────\n`;
    msg += `_Laporan bulanan membantu Anda melihat peta kekayaan jangka panjang._`;

    await sendTelegram(user.telegram_chat_id, msg);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: users } = await supabase.from('users').select('id, telegram_chat_id, display_name').not('telegram_chat_id', 'is', null).not('onboarded_at', 'is', null);
  if (!users) return NextResponse.json({ ok: true, sent: 0 });

  for (const u of users) {
    await generateMonthly(u);
    await new Promise(r => setTimeout(r, 400));
  }
  return NextResponse.json({ ok: true, sent: users.length });
}
