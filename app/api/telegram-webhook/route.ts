/**
 * app/api/telegram/route.ts
 * ==========================
 * Sprint 2 — User Management + Goals Tracker
 *
 * New in this version:
 *   - Auto-register user saat pertama chat (upsert ke tabel users)
 *   - Semua transaksi terikat user_id
 *   - /goals — lihat semua goals + progress
 *   - /goals tambah — guided flow tambah goal baru
 *   - /goals update [nama] [jumlah] — tambah progress ke goal
 *   - /networth — ringkasan aset & liabilitas
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runSecurityGate, writeAuditLog } from '@/lib/security';

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface TelegramMessage {
  chat: { id: number };
  from?: { username?: string; first_name?: string };
  text?: string;
}

interface User {
  id: string;
  telegram_chat_id: number;
  display_name: string | null;
}

interface Goal {
  id: string;
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  monthly_allocation: number | null;
  deadline: string | null;
  priority: number;
  status: string;
}

// ─── Telegram helpers ─────────────────────────────────────────────────────────
async function sendMessage(
  chatId: number,
  text: string,
  parseMode: 'Markdown' | 'HTML' = 'Markdown'
): Promise<void> {
  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    }
  );
}

// ─── Formatting helpers ───────────────────────────────────────────────────────
const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

const progressBar = (current: number, target: number, length = 10): string => {
  const pct = Math.min(current / target, 1);
  const filled = Math.round(pct * length);
  const empty = length - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty) + ` ${Math.round(pct * 100)}%`;
};

const monthsLeft = (deadline: string): string => {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'lewat deadline';
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
  return months <= 0 ? 'kurang dari sebulan' : `${months} bulan lagi`;
};

// ─── User Management ──────────────────────────────────────────────────────────
/**
 * Auto-register atau fetch user dari DB.
 * Dipanggil di setiap request — cached via upsert agar tidak double insert.
 */
async function getOrCreateUser(msg: TelegramMessage): Promise<User> {
  const chatId = msg.chat.id;
  const displayName = msg.from?.first_name ?? msg.from?.username ?? `User ${chatId}`;

  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        telegram_chat_id: chatId,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'telegram_chat_id',
        ignoreDuplicates: false,
      }
    )
    .select('id, telegram_chat_id, display_name')
    .single();

  if (error || !data) {
    throw new Error(`Failed to get/create user: ${error?.message}`);
  }

  return data as User;
}

// ─── Gemini: Extract financial data ──────────────────────────────────────────
async function extractFinancialData(userText: string): Promise<{
  type: 'income' | 'expense';
  amount: number;
  category_name: string;
  note: string;
} | null> {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Ekstrak data keuangan dari teks Indonesia berikut: "${userText}".
Jawab HANYA dengan JSON valid. Tanpa markdown, tanpa penjelasan.
Format: {"type":"income"|"expense","amount":number,"category_name":"string","note":"string"}

Aturan:
- amount harus angka positif tanpa simbol mata uang
- category_name dalam Bahasa Indonesia (contoh: "Makan", "Transport", "Gaji", "Investasi", "Tabungan")
- note deskripsi singkat transaksi
- Jika bukan transaksi keuangan, kembalikan: {"type":null,"amount":0,"category_name":"","note":""}`,
        }],
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Gemini: ${data.error.message}`);

  const raw: string = data.candidates[0].content.parts[0].text;
  const parsed = JSON.parse(raw.replace(/```json|```/gi, '').trim());

  if (!parsed.type || parsed.amount <= 0) return null;
  if (parsed.amount > 1_000_000_000_000) throw new Error('Amount tidak wajar');

  return parsed;
}

// ─── Gemini: Extract goal from natural language ───────────────────────────────
async function extractGoalData(userText: string): Promise<{
  name: string;
  target_amount: number;
  monthly_allocation: number | null;
  deadline: string | null;
  icon: string;
} | null> {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Ekstrak data goal/tujuan keuangan dari teks Indonesia berikut: "${userText}".
Jawab HANYA dengan JSON valid. Tanpa markdown, tanpa penjelasan.
Format: {"name":"string","target_amount":number,"monthly_allocation":number|null,"deadline":"YYYY-MM-DD"|null,"icon":"emoji"}

Aturan:
- name: nama goal yang ringkas (contoh: "Dana Haji", "Dana Darurat", "Beli Mobil")
- target_amount: angka positif (contoh: dari "85 juta" → 85000000)
- monthly_allocation: berapa per bulan jika disebutkan, null jika tidak
- deadline: tanggal target dalam format YYYY-MM-DD jika disebutkan, null jika tidak
- icon: emoji yang relevan (🕌 haji, 🛡️ darurat, 🚗 mobil, 🏠 rumah, ✈️ liburan, 📈 investasi, 🎯 lainnya)
- Jika tidak ada info goal, kembalikan: {"name":"","target_amount":0,"monthly_allocation":null,"deadline":null,"icon":"🎯"}`,
        }],
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Gemini: ${data.error.message}`);

  const raw: string = data.candidates[0].content.parts[0].text;
  const parsed = JSON.parse(raw.replace(/```json|```/gi, '').trim());

  if (!parsed.name || parsed.target_amount <= 0) return null;

  return parsed;
}

// ─── Command: /start ──────────────────────────────────────────────────────────
async function cmdStart(chatId: number, user: User): Promise<void> {
  const name = user.display_name?.split(' ')[0] ?? 'Kamu';
  await sendMessage(
    chatId,
    `👋 Halo *${name}!* Selamat datang di FinTrack AI.\n\n` +
    `Saya akan bantu kamu catat dan pantau keuangan dengan mudah.\n\n` +
    `*Cara pakai:*\n` +
    `Cukup ketik transaksimu dalam bahasa natural:\n` +
    `• _"Makan siang 35 ribu"_\n` +
    `• _"Bensin 100rb"_\n` +
    `• _"Terima gaji 5 juta"_\n` +
    `• _"Nabung 500 ribu"_\n\n` +
    `Ketik /help untuk semua perintah.`
  );
}

// ─── Command: /help ───────────────────────────────────────────────────────────
async function cmdHelp(chatId: number): Promise<void> {
  await sendMessage(
    chatId,
    `📖 *Daftar Perintah FinTrack AI*\n\n` +
    `*📊 Laporan*\n` +
    `/status — Cashflow bulan ini\n` +
    `/networth — Total aset & net worth\n` +
    `/laporan — Weekly summary sekarang\n\n` +
    `*🎯 Goals*\n` +
    `/goals — Lihat semua goals\n` +
    `/goals tambah — Tambah goal baru\n` +
    `/goals update [nama] [jumlah] — Tambah tabungan ke goal\n\n` +
    `*💬 Input Bebas*\n` +
    `Ketik transaksi langsung tanpa command.\n` +
    `Contoh: _"Makan 35rb"_, _"Gaji 8 juta"_`
  );
}

// ─── Command: /status ─────────────────────────────────────────────────────────
async function cmdStatus(chatId: number, userId: string): Promise<void> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  const { data: txs } = await supabase
    .from('transactions')
    .select('amount, type, categories(name)')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .gte('date', startOfMonth);

  const rows = txs ?? [];
  const income  = rows.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
  const expense = rows.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
  const balance = income - expense;

  // Top 3 kategori pengeluaran
  const catMap: Record<string, number> = {};
  rows
    .filter((t: any) => t.type === 'expense')
    .forEach((t: any) => {
      const cat = (t.categories as any)?.name ?? 'Lain-lain';
      catMap[cat] = (catMap[cat] ?? 0) + t.amount;
    });
  const topCats = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  let topStr = '';
  if (topCats.length > 0) {
    topStr = '\n\n📂 *Top pengeluaran:*\n' +
      topCats.map(([cat, amt], i) =>
        `${i + 1}. ${cat} — ${fmt(amt)}`
      ).join('\n');
  }

  const balanceIcon = balance >= 0 ? '💚' : '🔴';

  await sendMessage(
    chatId,
    `📊 *Status Bulan ${monthName}*\n\n` +
    `💚 Pemasukan  : ${fmt(income)}\n` +
    `🔴 Pengeluaran: ${fmt(expense)}\n` +
    `${balanceIcon} Saldo bersih: ${fmt(Math.abs(balance))}${balance < 0 ? ' _(defisit)_' : ''}\n` +
    `📝 Transaksi  : ${rows.length} kali` +
    topStr +
    `\n\n_/goals untuk lihat progress tujuanmu_`
  );
}

// ─── Command: /goals ──────────────────────────────────────────────────────────
async function cmdGoals(chatId: number, userId: string): Promise<void> {
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('priority', { ascending: true });

  if (!goals || goals.length === 0) {
    await sendMessage(
      chatId,
      `🎯 *Goals kamu masih kosong.*\n\n` +
      `Tambahkan goal pertamamu dengan:\n` +
      `/goals tambah\n\n` +
      `_Contoh: "Dana haji 85 juta target 2028"_`
    );
    return;
  }

  const lines = (goals as Goal[]).map((g, i) => {
    const bar = progressBar(g.current_amount, g.target_amount);
    const sisa = g.target_amount - g.current_amount;
    let detail = `${fmt(g.current_amount)} / ${fmt(g.target_amount)}\n   ${bar}`;

    if (sisa > 0) {
      if (g.monthly_allocation && g.monthly_allocation > 0) {
        const monthsNeeded = Math.ceil(sisa / g.monthly_allocation);
        detail += `\n   Sisa ${fmt(sisa)} · ~${monthsNeeded} bulan`;
      }
      if (g.deadline) {
        detail += `\n   ⏳ ${monthsLeft(g.deadline)}`;
      }
    } else {
      detail += `\n   ✅ Tercapai!`;
    }

    return `${i + 1}. ${g.icon} *${g.name}*\n   ${detail}`;
  });

  await sendMessage(
    chatId,
    `🎯 *Goals kamu (${goals.length})*\n\n` +
    lines.join('\n\n') +
    `\n\n_Update progress: /goals update [nama] [jumlah]_`
  );
}

// ─── Command: /goals tambah ───────────────────────────────────────────────────
async function cmdGoalsTambah(chatId: number, userId: string, args: string): Promise<void> {
  // Jika tidak ada args, tampilkan panduan
  if (!args.trim()) {
    await sendMessage(
      chatId,
      `➕ *Tambah Goal Baru*\n\n` +
      `Ketik dalam satu pesan, contoh:\n\n` +
      `_/goals tambah Dana haji 85 juta target 2028_\n` +
      `_/goals tambah Dana darurat 50 juta_\n` +
      `_/goals tambah Beli mobil 300 juta nabung 2 juta per bulan_\n\n` +
      `AI akan otomatis ekstrak detail goalnya.`
    );
    return;
  }

  const goalData = await extractGoalData(args);

  if (!goalData) {
    await sendMessage(
      chatId,
      `⚠️ Tidak bisa memahami detail goal.\n\n` +
      `Coba format: _/goals tambah [nama goal] [target amount] [deadline opsional]_\n` +
      `Contoh: _/goals tambah Dana haji 85 juta 2028_`
    );
    return;
  }

  const { data: newGoal, error } = await supabase
    .from('goals')
    .insert([{
      user_id: userId,
      name: goalData.name,
      icon: goalData.icon,
      target_amount: goalData.target_amount,
      current_amount: 0,
      monthly_allocation: goalData.monthly_allocation,
      deadline: goalData.deadline,
      priority: 3,
    }])
    .select()
    .single();

  if (error || !newGoal) {
    throw new Error(`Failed to create goal: ${error?.message}`);
  }

  const g = newGoal as Goal;
  let detail = `🎯 Target: *${fmt(g.target_amount)}*`;
  if (g.monthly_allocation) detail += `\n📅 Cicilan: *${fmt(g.monthly_allocation)}/bulan*`;
  if (g.deadline) {
    detail += `\n⏳ Deadline: *${new Date(g.deadline).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' })}*`;
    const sisa = g.target_amount;
    if (g.monthly_allocation) {
      const months = Math.ceil(sisa / g.monthly_allocation);
      detail += ` (~${months} bulan)`;
    }
  }

  void writeAuditLog(null, 'goal_created', 'info', { user_id: userId, goal_name: g.name });

  await sendMessage(
    chatId,
    `✅ *Goal berhasil ditambahkan!*\n\n` +
    `${g.icon} *${g.name}*\n` +
    detail +
    `\n\n_Progress 0% · Update dengan: /goals update ${g.name} [jumlah]_`
  );
}

// ─── Command: /goals update ───────────────────────────────────────────────────
async function cmdGoalsUpdate(chatId: number, userId: string, args: string): Promise<void> {
  if (!args.trim()) {
    await sendMessage(
      chatId,
      `📝 *Update Progress Goal*\n\n` +
      `Format: /goals update [nama goal] [jumlah]\n\n` +
      `Contoh:\n` +
      `_/goals update Dana Haji 2000000_\n` +
      `_/goals update Dana Haji 2 juta_`
    );
    return;
  }

  // Parse: cari angka di bagian akhir, sisanya adalah nama goal
  const amountMatch = args.match(/(\d[\d.,]*\s*(juta|ribu|rb|k|M)?)\s*$/i);
  if (!amountMatch) {
    await sendMessage(chatId, '⚠️ Format: /goals update [nama goal] [jumlah]\nContoh: _/goals update Dana Haji 2 juta_');
    return;
  }

  // Parse amount dengan dukungan "juta", "ribu", "rb"
  const rawAmount = amountMatch[1].toLowerCase().replace(/,/g, '').replace(/\./g, '');
  let amount = 0;
  if (rawAmount.includes('juta') || rawAmount.includes('m')) {
    amount = parseFloat(rawAmount) * 1_000_000;
  } else if (rawAmount.includes('ribu') || rawAmount.includes('rb') || rawAmount.includes('k')) {
    amount = parseFloat(rawAmount) * 1_000;
  } else {
    amount = parseFloat(rawAmount);
  }

  if (isNaN(amount) || amount <= 0) {
    await sendMessage(chatId, '⚠️ Jumlah tidak valid. Contoh: _/goals update Dana Haji 2000000_');
    return;
  }

  // Nama goal = semua sebelum angka
  const goalName = args.replace(amountMatch[0], '').trim();

  if (!goalName) {
    await sendMessage(chatId, '⚠️ Nama goal tidak ditemukan. Contoh: _/goals update Dana Haji 2 juta_');
    return;
  }

  // Cari goal — fuzzy match dengan ilike
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .ilike('name', `%${goalName}%`)
    .limit(1);

  if (!goals || goals.length === 0) {
    await sendMessage(
      chatId,
      `⚠️ Goal "_${goalName}_" tidak ditemukan.\n\nKetik /goals untuk lihat daftar goals kamu.`
    );
    return;
  }

  const goal = goals[0] as Goal;
  const newAmount = goal.current_amount + amount;
  const isAchieved = newAmount >= goal.target_amount;

  const { error } = await supabase
    .from('goals')
    .update({
      current_amount: newAmount,
      updated_at: new Date().toISOString(),
      ...(isAchieved ? { status: 'achieved', achieved_at: new Date().toISOString() } : {}),
    })
    .eq('id', goal.id);

  if (error) throw new Error(`Failed to update goal: ${error.message}`);

  const bar = progressBar(newAmount, goal.target_amount);
  const sisa = Math.max(0, goal.target_amount - newAmount);

  let msg =
    `${isAchieved ? '🏆' : '✅'} *${goal.icon} ${goal.name}*\n\n` +
    `+${fmt(amount)} ditambahkan\n\n` +
    `${fmt(newAmount)} / ${fmt(goal.target_amount)}\n` +
    `${bar}`;

  if (isAchieved) {
    msg += `\n\n🎉 *SELAMAT! Goal ini tercapai!*`;
  } else if (sisa > 0) {
    msg += `\n\nSisa: ${fmt(sisa)}`;
    if (goal.monthly_allocation) {
      const monthsLeft = Math.ceil(sisa / goal.monthly_allocation);
      msg += ` · ~${monthsLeft} bulan lagi`;
    }
  }

  await sendMessage(chatId, msg);
}

// ─── Command: /networth ───────────────────────────────────────────────────────
async function cmdNetWorth(chatId: number, userId: string): Promise<void> {
  const { data: assets } = await supabase
    .from('assets')
    .select('name, type, value, is_liability, institution')
    .eq('user_id', userId)
    .order('is_liability', { ascending: true })
    .order('value', { ascending: false });

  if (!assets || assets.length === 0) {
    await sendMessage(
      chatId,
      `💼 *Net Worth*\n\n` +
      `Belum ada data aset.\n\n` +
      `Tambahkan aset kamu di dashboard web untuk mulai tracking net worth.\n\n` +
      `_Aset: tabungan, investasi, properti_\n` +
      `_Liabilitas: KPR, hutang, cicilan_`
    );
    return;
  }

  const aset = assets.filter((a: any) => !a.is_liability);
  const liabilitas = assets.filter((a: any) => a.is_liability);

  const totalAset = aset.reduce((s: number, a: any) => s + a.value, 0);
  const totalLiabilitas = liabilitas.reduce((s: number, a: any) => s + a.value, 0);
  const netWorth = totalAset - totalLiabilitas;

  const asetLines = aset.slice(0, 5).map((a: any) =>
    `  • ${a.name}${a.institution ? ` (${a.institution})` : ''}: ${fmt(a.value)}`
  ).join('\n');

  const liabLines = liabilitas.slice(0, 3).map((a: any) =>
    `  • ${a.name}: ${fmt(a.value)}`
  ).join('\n');

  await sendMessage(
    chatId,
    `💼 *Net Worth Kamu*\n\n` +
    `✅ *Total Aset: ${fmt(totalAset)}*\n` +
    (asetLines ? asetLines + '\n' : '') +
    (liabilitas.length > 0
      ? `\n🔴 *Total Liabilitas: ${fmt(totalLiabilitas)}*\n` + (liabLines ? liabLines + '\n' : '')
      : '') +
    `\n${'─'.repeat(25)}\n` +
    `${netWorth >= 0 ? '💚' : '🔴'} *Net Worth: ${fmt(Math.abs(netWorth))}*` +
    (netWorth < 0 ? ' _(negatif)_' : '') +
    `\n\n_Update aset di dashboard web_`
  );
}

// ─── Command: /laporan ────────────────────────────────────────────────────────
async function cmdLaporan(chatId: number, userId: string): Promise<void> {
  // 7 hari terakhir
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date();

  const { data: txs } = await supabase
    .from('transactions')
    .select('amount, type, categories(name)')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .gte('date', since);

  const rows = txs ?? [];
  const income  = rows.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
  const expense = rows.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);

  // Top kategori
  const catMap: Record<string, number> = {};
  rows.filter((t: any) => t.type === 'expense').forEach((t: any) => {
    const cat = (t.categories as any)?.name ?? 'Lain-lain';
    catMap[cat] = (catMap[cat] ?? 0) + t.amount;
  });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Goals snapshot
  const { data: goals } = await supabase
    .from('goals')
    .select('name, icon, current_amount, target_amount')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('priority', { ascending: true })
    .limit(3);

  const weekLabel = `${new Date(since).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}–${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  let goalsStr = '';
  if (goals && goals.length > 0) {
    goalsStr = '\n\n🎯 *Goals:*\n' + (goals as Goal[]).map(g => {
      const pct = Math.round((g.current_amount / g.target_amount) * 100);
      return `• ${g.icon} ${g.name} — ${pct}% (${fmt(g.current_amount)})`;
    }).join('\n');
  }

  let topStr = '';
  if (topCats.length > 0) {
    topStr = '\n\n📂 *Top pengeluaran:*\n' + topCats.map(([cat, amt], i) =>
      `${i + 1}. ${cat} — ${fmt(amt)}`
    ).join('\n');
  }

  await sendMessage(
    chatId,
    `📊 *Laporan Mingguan*\n_${weekLabel}_\n\n` +
    `💚 Pemasukan    : ${fmt(income)}\n` +
    `🔴 Pengeluaran  : ${fmt(expense)}\n` +
    `${income - expense >= 0 ? '💰' : '⚠️'} Saldo bersih : ${fmt(Math.abs(income - expense))}` +
    (income - expense < 0 ? ' _(defisit)_' : '') +
    topStr +
    goalsStr +
    `\n\n_Ketik /status untuk detail bulan ini_`
  );
}


// ─── Anomaly Detection ────────────────────────────────────────────────────────
/**
 * Cek apakah transaksi ini tidak wajar dibanding historis kategori yang sama.
 * Strategi: bandingkan dengan rata-rata 30 hari terakhir di kategori ini.
 * Alert jika: amount >= 2.5x rata-rata DAN rata-rata > 0 DAN ada >= 3 data historis.
 * Fire-and-forget — tidak pernah block response utama.
 */
async function checkAnomaly(
  chatId: number,
  userId: string,
  categoryId: string,
  categoryName: string,
  amount: number
): Promise<void> {
  try {
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const today   = new Date().toISOString().split('T')[0];

    // Ambil semua transaksi kategori ini 30 hari terakhir (kecuali hari ini)
    const { data: history } = await supabase
      .from('transactions')
      .select('amount, date')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .eq('type', 'expense')
      .eq('is_deleted', false)
      .gte('date', since30)
      .lt('date', today)   // exclude hari ini supaya tidak compare dengan dirinya sendiri
      .order('date', { ascending: false });

    const rows = history ?? [];

    // Butuh minimal 3 data historis untuk anomaly detection yang bermakna
    if (rows.length < 3) return;

    const total = rows.reduce((s: number, r: any) => s + r.amount, 0);
    const avg   = total / rows.length;

    // Tidak anomali kalau rata-rata sangat kecil
    if (avg < 5000) return;

    const ratio = amount / avg;

    // Threshold: 2.5x rata-rata = anomali
    if (ratio < 2.5) return;

    // Susun pesan alert
    const ratioLabel = ratio >= 5 ? `${Math.round(ratio)}x` : `${ratio.toFixed(1)}x`;
    const dayCount   = rows.length;

    await sendMessage(
      chatId,
      `⚠️ *Pengeluaran tidak biasa terdeteksi!*

` +
      `📂 Kategori : *${categoryName}*
` +
      `💸 Transaksi ini : *${fmt(amount)}*
` +
      `📊 Rata-rata 30 hari : ${fmt(Math.round(avg))} _(${dayCount} data)_
` +
      `📈 Selisih : *${ratioLabel} lebih besar* dari biasanya

` +
      `_Ini hanya informasi — bukan kesalahan. Ketik /status untuk lihat konteks bulan ini._`
    );

    void writeAuditLog(chatId, 'anomaly_detected', 'warn', {
      category: categoryName,
      amount,
      avg: Math.round(avg),
      ratio: parseFloat(ratio.toFixed(2)),
    });

  } catch {
    // Anomaly check tidak boleh break flow utama
  }
}

// ─── Transaction handler ──────────────────────────────────────────────────────
async function handleTransaction(
  chatId: number,
  userId: string,
  userText: string
): Promise<void> {
  const data = await extractFinancialData(userText);

  if (!data) {
    await sendMessage(
      chatId,
      `🤔 Tidak mengenali sebagai transaksi keuangan.\n\n` +
      `Contoh yang bisa saya proses:\n` +
      `• _"Makan siang 35 ribu"_\n` +
      `• _"Bensin 100rb"_\n` +
      `• _"Gaji 8 juta"_\n` +
      `• _"Nabung 500 ribu"_`
    );
    return;
  }

  // Cari atau buat kategori (prioritas: kategori user dulu, lalu sistem)
  let { data: cat } = await supabase
    .from('categories')
    .select('id')
    .ilike('name', data.category_name)
    .eq('type', data.type)
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order('user_id', { ascending: false }) // prefer user's category
    .limit(1)
    .maybeSingle();

  if (!cat) {
    const { data: newCat, error: catErr } = await supabase
      .from('categories')
      .insert([{ name: data.category_name, type: data.type, user_id: userId }])
      .select()
      .single();
    if (catErr) throw catErr;
    cat = newCat;
  }

  // Simpan transaksi
  const { error: txErr } = await supabase.from('transactions').insert([{
    user_id:     userId,
    category_id: cat?.id,
    type:        data.type,
    amount:      data.amount,
    note:        data.note,
    source:      'bot',
    date:        new Date().toISOString().split('T')[0], // DATE only: YYYY-MM-DD
    created_at:  new Date().toISOString(),
  }]);

  if (txErr) throw txErr;

  void writeAuditLog(null, 'transaction_created', 'info', {
    user_id: userId,
    type: data.type,
    category: data.category_name,
  });

  // Anomaly detection — hanya untuk pengeluaran, fire-and-forget
  if (data.type === 'expense' && cat?.id) {
    void checkAnomaly(chatId, userId, cat.id, data.category_name, data.amount);
  }

  const typeEmoji = data.type === 'income' ? '💚' : '🔴';
  const typeLabel = data.type === 'income' ? 'Pemasukan' : 'Pengeluaran';

  await sendMessage(
    chatId,
    `✅ *Tercatat!*\n\n` +
    `${typeEmoji} *${typeLabel}*\n` +
    `💰 Nominal   : *${fmt(data.amount)}*\n` +
    `📂 Kategori  : ${data.category_name}\n` +
    `📝 Catatan   : ${data.note || '-'}\n\n` +
    `_/status untuk lihat ringkasan bulan ini_`
  );
}

// ─── Command router ───────────────────────────────────────────────────────────
async function routeCommand(
  chatId: number,
  userId: string,
  text: string,
  user: User
): Promise<boolean> {
  const lower = text.toLowerCase().trim();

  if (lower === '/start')          { await cmdStart(chatId, user); return true; }
  if (lower === '/help')           { await cmdHelp(chatId); return true; }
  if (lower === '/status')         { await cmdStatus(chatId, userId); return true; }
  if (lower === '/networth')       { await cmdNetWorth(chatId, userId); return true; }
  if (lower === '/laporan')        { await cmdLaporan(chatId, userId); return true; }

  if (lower === '/goals') {
    await cmdGoals(chatId, userId);
    return true;
  }
  if (lower.startsWith('/goals tambah')) {
    const args = text.slice('/goals tambah'.length).trim();
    await cmdGoalsTambah(chatId, userId, args);
    return true;
  }
  if (lower.startsWith('/goals update')) {
    const args = text.slice('/goals update'.length).trim();
    await cmdGoalsUpdate(chatId, userId, args);
    return true;
  }

  return false; // bukan command yang dikenal
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  let body: any;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  // Security gate (5 layer)
  const security = await runSecurityGate(request, body);
  if (!security.allowed) return NextResponse.json({ ok: true });

  const { chatId } = security.context!;
  const msg: TelegramMessage = body.message;
  const userText = msg.text ?? '';

  try {
    // Auto-register / fetch user
    const user = await getOrCreateUser(msg);
    const userId = user.id;

    // Route commands
    if (userText.startsWith('/')) {
      const handled = await routeCommand(chatId, userId, userText, user);
      if (!handled) {
        await sendMessage(chatId, '❓ Command tidak dikenal. Ketik /help untuk daftar perintah.');
      }
      return NextResponse.json({ ok: true });
    }

    // Non-text messages
    if (security.context?.messageType !== 'text') {
      await sendMessage(chatId, '📝 Kirim catatan keuanganmu dalam teks ya.\nContoh: _"Makan siang 35 ribu"_');
      return NextResponse.json({ ok: true });
    }

    // Natural language → transaction
    await handleTransaction(chatId, userId, userText);
    return NextResponse.json({ ok: true });

  } catch (err: any) {
    void writeAuditLog(chatId, 'handler_error', 'error', { message: err.message });
    console.error('[HANDLER ERROR]', { chatId, error: err.message });

    void sendMessage(chatId, '⚠️ Terjadi kesalahan. Coba lagi dalam beberapa detik ya.');
    return NextResponse.json({ ok: true });
  }
}
