// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface Transaction {
  amount: number;
  type: 'income' | 'expense';
  date: string;
  categories: { name: string } | null;
}
interface Goal {
  id: string; name: string; icon: string;
  target_amount: number; current_amount: number;
  monthly_allocation: number | null; deadline: string | null;
}
interface Asset { value: number; is_liability: boolean }

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const pct = (v: number, t: number) => t > 0 ? Math.round((v / t) * 100) : 0;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users').select('id, display_name, telegram_chat_id')
    .eq('email', user.email!).maybeSingle();
  if (!profile) redirect('/login');

  const userId = profile.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

  const [txMonth, txPrev, txLast30, goals, assets] = await Promise.all([
    supabase.from('transactions').select('amount, type, date, categories(name)')
      .eq('user_id', userId).eq('is_deleted', false).gte('date', monthStart),
    supabase.from('transactions').select('amount, type')
      .eq('user_id', userId).eq('is_deleted', false)
      .gte('date', prevMonthStart).lte('date', prevMonthEnd),
    supabase.from('transactions').select('amount, type, date')
      .eq('user_id', userId).eq('is_deleted', false)
      .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
      .order('date', { ascending: true }),
    supabase.from('goals').select('*').eq('user_id', userId).eq('status', 'active')
      .order('priority', { ascending: true }).limit(3),
    supabase.from('assets').select('value, is_liability').eq('user_id', userId),
  ]);

  const txs      = (txMonth.data ?? []) as unknown as Transaction[];
  const prevTxs  = (txPrev.data ?? []) as unknown as Transaction[];
  const last30   = (txLast30.data ?? []) as unknown as Transaction[];
  const goalList = (goals.data ?? []) as Goal[];
  const assetList = (assets.data ?? []) as Asset[];

  const income   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense  = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance  = income - expense;
  const prevExp  = prevTxs.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
  const expTrend = prevExp > 0 ? ((expense - prevExp) / prevExp) * 100 : 0;

  const catMap: Record<string, number> = {};
  txs.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.categories?.name ?? 'Lain-lain';
    catMap[cat] = (catMap[cat] ?? 0) + t.amount;
  });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const totalAsset = assetList.filter(a => !a.is_liability).reduce((s, a) => s + a.value, 0);
  const totalLiab  = assetList.filter(a => a.is_liability).reduce((s, a) => s + a.value, 0);
  const netWorth   = totalAsset - totalLiab;

  // Chart 30 hari
  const chartMap: Record<string, { income: number; expense: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    chartMap[d] = { income: 0, expense: 0 };
  }
  last30.forEach(t => { if (chartMap[t.date]) chartMap[t.date][t.type] += t.amount; });
  const chartData = Object.entries(chartMap).map(([date, v]) => ({ date, ...v }));
  const maxVal    = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 1);

  const monthLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const dateLabel  = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const firstName  = profile.display_name?.split(' ')[0] ?? 'Kamu';

  return (
    <div style={{ color: '#f0f0f5', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      <style>{`
        .ov-grid3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 12px; }
        .ov-grid2 { display: grid; grid-template-columns: 1.6fr 1fr; gap: 12px; margin-bottom: 12px; }
        @media (max-width: 768px) {
          .ov-grid3 { grid-template-columns: 1fr; gap: 8px; }
          .ov-grid2 { grid-template-columns: 1fr; gap: 8px; }
        }
        .ov-card { background:#111118; border:1px solid #1f1f2e; border-radius:12px; padding:16px; }
        @media (max-width: 768px) { .ov-card { padding:14px; border-radius:10px; } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 4px', letterSpacing: '-0.4px' }}>
          Selamat datang, {firstName} 👋
        </h1>
        <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>{dateLabel}</p>
      </div>

      {/* Row 1: 3 kartu KPI */}
      <div className="ov-grid3">
        <div className="ov-card">
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Net Worth</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: netWorth >= 0 ? '#4ade80' : '#f87171', letterSpacing: '-0.5px' }}>
            {fmt(Math.abs(netWorth))}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
            {assetList.length === 0 ? 'Belum ada aset' : `Aset ${fmt(totalAsset)}`}
          </div>
        </div>
        <div className="ov-card">
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Pemasukan</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#4ade80', letterSpacing: '-0.5px' }}>{fmt(income)}</div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{monthLabel}</div>
        </div>
        <div className="ov-card">
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Pengeluaran</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#f87171', letterSpacing: '-0.5px' }}>{fmt(expense)}</div>
          <div style={{ fontSize: '11px', marginTop: '4px', color: Math.abs(expTrend) > 5 ? (expTrend > 0 ? '#f87171' : '#4ade80') : '#6b7280' }}>
            {prevExp > 0 ? `${expTrend > 0 ? '↑' : '↓'} ${Math.abs(expTrend).toFixed(0)}% vs bln lalu` : monthLabel}
          </div>
        </div>
      </div>

      {/* Saldo bar */}
      <div className="ov-card" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>Saldo Bersih {monthLabel}</span>
          <span style={{ fontSize: '15px', fontWeight: '700', color: balance >= 0 ? '#4ade80' : '#f87171' }}>
            {balance >= 0 ? '+' : '-'}{fmt(Math.abs(balance))}
          </span>
        </div>
        {income > 0 && (
          <div style={{ height: '6px', background: '#1f1f2e', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '99px',
              width: `${Math.min(pct(expense, income), 100)}%`,
              background: pct(expense, income) > 90 ? '#ef4444' : pct(expense, income) > 70 ? '#f59e0b' : '#2563eb',
            }}/>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
          <span style={{ fontSize: '11px', color: '#374151' }}>
            {income > 0 ? `${pct(expense, income)}% pemasukan terpakai` : 'Belum ada pemasukan'}
          </span>
          <span style={{ fontSize: '11px', color: '#374151' }}>{txs.length} transaksi</span>
        </div>
      </div>

      {/* Row 2: Grafik + Goals */}
      <div className="ov-grid2">
        {/* Grafik */}
        <div className="ov-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#9ca3af' }}>30 Hari Terakhir</span>
            <div style={{ display: 'flex', gap: '10px', fontSize: '11px' }}>
              <span style={{ color: '#4ade80' }}>● Masuk</span>
              <span style={{ color: '#f87171' }}>● Keluar</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '80px' }}>
            {chartData.map((d, i) => {
              const incH = Math.round((d.income  / maxVal) * 76);
              const expH = Math.round((d.expense / maxVal) * 76);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', gap: '1px', alignItems: 'flex-end', height: '80px' }}>
                  {d.income > 0  && <div style={{ flex: 1, height: `${Math.max(incH, 2)}px`, background: '#166534', borderRadius: '1px 1px 0 0' }}/>}
                  {d.expense > 0 && <div style={{ flex: 1, height: `${Math.max(expH, 2)}px`, background: '#7f1d1d', borderRadius: '1px 1px 0 0' }}/>}
                  {d.income === 0 && d.expense === 0 && <div style={{ flex: 1, height: '2px', background: '#1f1f2e' }}/>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Goals */}
        <div className="ov-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#9ca3af' }}>Goals</span>
            <a href="/dashboard/goals" style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'none' }}>Semua →</a>
          </div>
          {goalList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '12px 0', color: '#6b7280', fontSize: '12px' }}>
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>🎯</div>
              Belum ada goals
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {goalList.map(g => {
                const p = Math.min(pct(g.current_amount, g.target_amount), 100);
                return (
                  <div key={g.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '500' }}>{g.icon} {g.name}</span>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>{p}%</span>
                    </div>
                    <div style={{ height: '4px', background: '#1f1f2e', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '99px', width: `${p}%`, background: p >= 100 ? '#4ade80' : '#2563eb' }}/>
                    </div>
                    <div style={{ fontSize: '10px', color: '#374151', marginTop: '2px' }}>
                      {fmt(g.current_amount)} / {fmt(g.target_amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top kategori */}
      <div className="ov-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#9ca3af' }}>Top Pengeluaran {monthLabel}</span>
          <a href="/dashboard/transactions" style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'none' }}>Semua →</a>
        </div>
        {topCats.length === 0 ? (
          <div style={{ color: '#6b7280', fontSize: '13px', textAlign: 'center', padding: '8px 0' }}>Belum ada pengeluaran</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topCats.map(([cat, amt], i) => {
              const p = pct(amt, expense);
              const colors = ['#2563eb','#6366f1','#8b5cf6','#a855f7','#c084fc'];
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280', width: '14px', flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{cat}</span>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>{fmt(amt)}</span>
                    </div>
                    <div style={{ height: '4px', background: '#1f1f2e', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '99px', width: `${p}%`, background: colors[i] ?? '#374151' }}/>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#374151', width: '28px', textAlign: 'right', flexShrink: 0 }}>{p}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
