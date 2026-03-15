// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Transaction {
  amount: number;
  type: 'income' | 'expense';
  date: string;
  categories: { name: string } | null;
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
}

interface Asset {
  value: number;
  is_liability: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

const pct = (val: number, total: number) =>
  total > 0 ? Math.round((val / total) * 100) : 0;

// ─── Server Component ─────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('id, display_name, telegram_chat_id')
    .eq('email', user.email!)
    .maybeSingle();

  if (!profile) redirect('/login');

  const userId    = profile.id;
  const firstName = profile.display_name?.split(' ')[0] ?? 'Kamu';
  const now       = new Date();

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().split('T')[0];
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString().split('T')[0];
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    .toISOString().split('T')[0];

  // ── Fetch semua data paralel ─────────────────────────────────────────────
  const [txMonth, txPrevMonth, txLast30, goals, assets] = await Promise.all([
    // Transaksi bulan ini
    supabase.from('transactions').select('amount, type, date, categories(name)')
      .eq('user_id', userId).eq('is_deleted', false).gte('date', monthStart),
    // Transaksi bulan lalu (untuk perbandingan)
    supabase.from('transactions').select('amount, type')
      .eq('user_id', userId).eq('is_deleted', false)
      .gte('date', prevMonthStart).lte('date', prevMonthEnd),
    // 30 hari terakhir untuk grafik
    supabase.from('transactions').select('amount, type, date')
      .eq('user_id', userId).eq('is_deleted', false)
      .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
      .order('date', { ascending: true }),
    // Goals aktif
    supabase.from('goals').select('*').eq('user_id', userId).eq('status', 'active')
      .order('priority', { ascending: true }).limit(4),
    // Aset & liabilitas
    supabase.from('assets').select('value, is_liability').eq('user_id', userId),
  ]);

  const txs     = (txMonth.data ?? []) as unknown as Transaction[];
  const prevTxs = (txPrevMonth.data ?? []) as unknown as Transaction[];
  const last30  = (txLast30.data ?? []) as unknown as Transaction[];
  const goalList = (goals.data ?? []) as Goal[];
  const assetList = (assets.data ?? []) as Asset[];

  // ── Kalkulasi cashflow ────────────────────────────────────────────────────
  const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const prevExpense = prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const expenseTrend = prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : 0;

  // ── Top kategori ──────────────────────────────────────────────────────────
  const catMap: Record<string, number> = {};
  txs.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.categories?.name ?? 'Lain-lain';
    catMap[cat] = (catMap[cat] ?? 0) + t.amount;
  });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ── Net worth ─────────────────────────────────────────────────────────────
  const totalAsset     = assetList.filter(a => !a.is_liability).reduce((s, a) => s + a.value, 0);
  const totalLiability = assetList.filter(a => a.is_liability).reduce((s, a) => s + a.value, 0);
  const netWorth       = totalAsset - totalLiability;

  // ── Grafik 30 hari: group by date ────────────────────────────────────────
  const chartMap: Record<string, { income: number; expense: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    chartMap[d] = { income: 0, expense: 0 };
  }
  last30.forEach(t => {
    if (chartMap[t.date]) {
      chartMap[t.date][t.type] += t.amount;
    }
  });
  const chartData = Object.entries(chartMap).map(([date, v]) => ({ date, ...v }));
  const maxVal    = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 1);

  // ── Serialise untuk client component ─────────────────────────────────────
  const chartJson    = JSON.stringify(chartData);
  const topCatsJson  = JSON.stringify(topCats);
  const goalListJson = JSON.stringify(goalList);

  const dateLabel = now.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const monthLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ color: '#f0f0f5', fontFamily: '"DM Sans", system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 4px', letterSpacing: '-0.4px' }}>
          Selamat datang, {firstName} 👋
        </h1>
        <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>{dateLabel}</p>
      </div>

      {/* ── ROW 1: Net Worth + Cashflow + Balance ───────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>

        {/* Net Worth */}
        <div style={card}>
          <div style={cardLabel}>Net Worth</div>
          <div style={{ ...bigNumber, color: netWorth >= 0 ? '#4ade80' : '#f87171' }}>
            {fmt(Math.abs(netWorth))}
          </div>
          <div style={subText}>
            {assetList.length === 0
              ? 'Belum ada aset — tambahkan via bot atau settings'
              : `Aset ${fmt(totalAsset)}  ·  Liabilitas ${fmt(totalLiability)}`}
          </div>
        </div>

        {/* Pemasukan */}
        <div style={card}>
          <div style={cardLabel}>Pemasukan {monthLabel}</div>
          <div style={{ ...bigNumber, color: '#4ade80' }}>{fmt(income)}</div>
          <div style={subText}>{txs.filter(t => t.type === 'income').length} transaksi</div>
        </div>

        {/* Pengeluaran */}
        <div style={card}>
          <div style={cardLabel}>Pengeluaran {monthLabel}</div>
          <div style={{ ...bigNumber, color: '#f87171' }}>{fmt(expense)}</div>
          <div style={{ ...subText, color: Math.abs(expenseTrend) > 5
            ? (expenseTrend > 0 ? '#f87171' : '#4ade80') : '#6b7280' }}>
            {prevExpense > 0
              ? `${expenseTrend > 0 ? '↑' : '↓'} ${Math.abs(expenseTrend).toFixed(0)}% vs bulan lalu`
              : 'Tidak ada data bulan lalu'}
          </div>
        </div>
      </div>

      {/* ── ROW 2: Saldo bersih bar ─────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: '14px', padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>
            Saldo Bersih {monthLabel}
          </span>
          <span style={{ fontSize: '16px', fontWeight: '600', color: balance >= 0 ? '#4ade80' : '#f87171' }}>
            {balance >= 0 ? '+' : '-'}{fmt(Math.abs(balance))}
          </span>
        </div>
        {income > 0 && (
          <div style={{ height: '6px', background: '#1f1f2e', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '99px',
              width: `${Math.min(pct(expense, income), 100)}%`,
              background: pct(expense, income) > 90 ? '#ef4444' : pct(expense, income) > 70 ? '#f59e0b' : '#2563eb',
              transition: 'width .6s ease',
            }}/>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          <span style={{ fontSize: '11px', color: '#374151' }}>
            {income > 0 ? `${pct(expense, income)}% dari pemasukan terpakai` : 'Belum ada pemasukan bulan ini'}
          </span>
          <span style={{ fontSize: '11px', color: '#374151' }}>
            {txs.length} transaksi total
          </span>
        </div>
      </div>

      {/* ── ROW 3: Grafik + Goals ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '14px', marginBottom: '14px' }}>

        {/* Grafik 30 hari */}
        <div style={{ ...card, padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#9ca3af' }}>Aktivitas 30 Hari Terakhir</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: '#4ade80' }}>● Masuk</span>
              <span style={{ fontSize: '11px', color: '#f87171' }}>● Keluar</span>
            </div>
          </div>
          {/* Bar chart — rendered via inline script */}
          <div id="chart-container" style={{ height: '120px', display: 'flex', alignItems: 'flex-end', gap: '3px' }}>
            {chartData.map((d, i) => {
              const incH = maxVal > 0 ? Math.round((d.income  / maxVal) * 110) : 0;
              const expH = maxVal > 0 ? Math.round((d.expense / maxVal) * 110) : 0;
              const isToday = d.date === now.toISOString().split('T')[0];
              return (
                <div key={i} title={`${d.date}\nMasuk: ${fmt(d.income)}\nKeluar: ${fmt(d.expense)}`}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '2px', justifyContent: 'flex-end', height: '120px', cursor: 'default' }}>
                  {d.income > 0 && (
                    <div style={{ width: '100%', height: `${incH}px`, background: '#166534',
                      borderRadius: '2px 2px 0 0', minHeight: '2px',
                      outline: isToday ? '1px solid #4ade80' : 'none' }}/>
                  )}
                  {d.expense > 0 && (
                    <div style={{ width: '100%', height: `${expH}px`, background: '#7f1d1d',
                      borderRadius: d.income > 0 ? '0' : '2px 2px 0 0', minHeight: '2px' }}/>
                  )}
                  {d.income === 0 && d.expense === 0 && (
                    <div style={{ width: '100%', height: '2px', background: '#1f1f2e' }}/>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', color: '#374151' }}>
              {new Date(Date.now() - 29 * 86400000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
            </span>
            <span style={{ fontSize: '11px', color: '#374151' }}>Hari ini</span>
          </div>
        </div>

        {/* Goals */}
        <div style={{ ...card, padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#9ca3af' }}>Goals</span>
            <a href="/dashboard/goals" style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'none' }}>
              Lihat semua →
            </a>
          </div>
          {goalList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎯</div>
              <div style={{ color: '#6b7280', fontSize: '12px' }}>Belum ada goals</div>
              <div style={{ color: '#374151', fontSize: '11px', marginTop: '4px' }}>
                Ketik /goals tambah di bot
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {goalList.slice(0, 4).map(g => {
                const p = Math.min(pct(g.current_amount, g.target_amount), 100);
                return (
                  <div key={g.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '500' }}>
                        {g.icon} {g.name}
                      </span>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>{p}%</span>
                    </div>
                    <div style={{ height: '5px', background: '#1f1f2e', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '99px', width: `${p}%`,
                        background: p >= 100 ? '#4ade80' : p >= 60 ? '#2563eb' : '#6366f1',
                      }}/>
                    </div>
                    <div style={{ fontSize: '10px', color: '#374151', marginTop: '3px' }}>
                      {fmt(g.current_amount)} / {fmt(g.target_amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 4: Top Kategori ─────────────────────────────────────────────── */}
      <div style={{ ...card, padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#9ca3af' }}>
            Top Pengeluaran {monthLabel}
          </span>
          <a href="/dashboard/transactions" style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'none' }}>
            Semua transaksi →
          </a>
        </div>
        {topCats.length === 0 ? (
          <div style={{ color: '#6b7280', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>
            Belum ada pengeluaran bulan ini
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topCats.map(([cat, amt], i) => {
              const p = pct(amt, expense);
              const colors = ['#2563eb', '#6366f1', '#8b5cf6', '#a855f7', '#c084fc'];
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280', width: '16px', flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{cat}</span>
                      <span style={{ fontSize: '13px', color: '#9ca3af' }}>{fmt(amt)}</span>
                    </div>
                    <div style={{ height: '4px', background: '#1f1f2e', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '99px', width: `${p}%`,
                        background: colors[i] ?? '#374151',
                      }}/>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#374151', width: '30px', textAlign: 'right', flexShrink: 0 }}>
                    {p}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Telegram connect prompt */}
      {!profile.telegram_chat_id && (
        <div style={{
          marginTop: '14px', padding: '16px 20px',
          background: '#0f1a0a', border: '1px solid #1a3a0f',
          borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <div style={{ fontSize: '20px' }}>📱</div>
          <div>
            <div style={{ color: '#4ade80', fontSize: '13px', fontWeight: '500', marginBottom: '2px' }}>
              Hubungkan Telegram Bot
            </div>
            <div style={{ color: '#374151', fontSize: '12px' }}>
              Cari bot kamu di Telegram dan kirim /start untuk mulai input transaksi otomatis.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Style tokens ─────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: '#111118',
  border: '1px solid #1f1f2e',
  borderRadius: '12px',
  padding: '20px',
};

const cardLabel: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b7280',
  fontWeight: '500',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
};

const bigNumber: React.CSSProperties = {
  fontSize: '26px',
  fontWeight: '700',
  letterSpacing: '-0.5px',
  marginBottom: '4px',
  lineHeight: 1.1,
};

const subText: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b7280',
};
