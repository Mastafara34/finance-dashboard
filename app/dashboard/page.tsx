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
interface Asset { id: string; name: string; value: number; is_liability: boolean; type: string }

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

  const [txMonth, txPrev, txLast30, goals, assets, history] = await Promise.all([
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
    supabase.from('assets').select('id, name, value, is_liability, type').eq('user_id', userId),
    supabase.from('net_worth_history').select('date, net_worth')
      .eq('user_id', userId).order('date', { ascending: true }).limit(30),
  ]);

  const txs      = (txMonth.data ?? []) as unknown as Transaction[];
  const prevTxs  = (txPrev.data ?? []) as unknown as Transaction[];
  const last30   = (txLast30.data ?? []) as unknown as Transaction[];
  const goalList = (goals.data ?? []) as Goal[];
  const assetList = (assets.data ?? []) as Asset[];
  const nwHistory = (history.data ?? []) as { date: string; net_worth: number }[];

  const income   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense  = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance  = income - expense;
  const savingRate = income > 0 ? ((income - expense) / income) * 100 : 0;

  const prevExp  = prevTxs.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
  const prevInc  = prevTxs.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
  const prevSavRate = prevInc > 0 ? ((prevInc - prevExp) / prevInc) * 100 : 0;
  
  const expTrend = prevExp > 0 ? ((expense - prevExp) / prevExp) * 100 : 0;
  const savRateTrend = savingRate - prevSavRate;

  const catMap: Record<string, number> = {};
  txs.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.categories?.name ?? 'Lain-lain';
    catMap[cat] = (catMap[cat] ?? 0) + t.amount;
  });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const totalAsset = assetList.filter(a => !a.is_liability).reduce((s, a) => s + a.value, 0);
  const totalLiab  = assetList.filter(a => a.is_liability).reduce((s, a) => s + a.value, 0);
  const netWorth   = totalAsset - totalLiab;

  // Investment calculation (assuming 'investment' type assets)
  const investments = assetList.filter(a => !a.is_liability && a.type === 'investment').reduce((s, a) => s + a.value, 0);
  const investmentRatio = income > 0 ? (investments / (income * 12)) * 100 : 0; 
  const monthlyInvRatio = income > 0 ? (txs.filter(t => t.type === 'expense' && t.categories?.name?.toLowerCase().includes('invest')).reduce((s, t) => s + t.amount, 0) / income) * 100 : 0;

  // Emergency Fund Calculation
  const liquidAssets = assetList.filter(a => !a.is_liability && a.type === 'cash').reduce((s, a) => s + a.value, 0);
  const monthlyExpBase = prevExp > 0 ? prevExp : expense;
  const efTargetMin = monthlyExpBase * 6;
  const efTargetMax = monthlyExpBase * 12;
  const efProgress = efTargetMin > 0 ? Math.min(pct(liquidAssets, efTargetMin), 100) : 0;
  const monthsCovered = monthlyExpBase > 0 ? (liquidAssets / monthlyExpBase) : 0;

  // Financial Health Score Calculation (/100)
  // 1. Saving Rate (>20%) - 20 pts
  const s1 = Math.min((savingRate / 20) * 20, 20);
  // 2. Emergency Fund (6-12 months) - 20 pts
  const s2 = Math.min((monthsCovered / 6) * 20, 20);
  // 3. Debt Ratio (<30% of income) - 20 pts
  const monthlyDebt = txs.filter(t => t.type === 'expense' && t.categories?.name?.toLowerCase().includes('cicilan')).reduce((s, t) => s + t.amount, 0);
  const debtRatio = income > 0 ? (monthlyDebt / income) * 100 : 0;
  const s3 = debtRatio <= 30 ? 20 : Math.max(0, 20 - ((debtRatio - 30) / 2));
  // 4. Investment Ratio (>15%) - 20 pts
  const s4 = Math.min((monthlyInvRatio / 15) * 20, 20);
  // 5. Cashflow Surplus (Positive) - 20 pts
  const s5 = balance > 0 ? 20 : 0;

  const healthScore = Math.round(s1 + s2 + s3 + s4 + s5);
  const healthLabel = healthScore >= 80 ? 'Sangat Sehat' : healthScore >= 60 ? 'Sehat' : healthScore >= 40 ? 'Cukup' : 'Perlu Perhatian';
  const healthColor = healthScore >= 80 ? '#4ade80' : healthScore >= 60 ? '#60a5fa' : healthScore >= 40 ? '#f59e0b' : '#f87171';

  // Financial Independence (FI) Calculation
  const annualExpense = monthlyExpBase * 12;
  const fiNumber = annualExpense * 25;
  const fiProgress = fiNumber > 0 ? Math.min(pct(netWorth, fiNumber), 100) : 0;
  
  // Passive Income Coverage (Assuming 5% annual return on investments)
  const estimatedAnnualPassiveIncome = investments * 0.05;
  const monthlyPassiveIncome = estimatedAnnualPassiveIncome / 12;
  const passiveIncomeCoverage = monthlyExpBase > 0 ? Math.min(pct(monthlyPassiveIncome, monthlyExpBase), 100) : 0;

  // Burn Rate & Survival Time
  // Burn Rate is the monthly expense base we already calculated
  const burnRate = monthlyExpBase;
  const survivalTime = burnRate > 0 ? (liquidAssets / burnRate) : 0;
  const survivalLabel = survivalTime >= 12 ? 'Sangat Aman' : survivalTime >= 6 ? 'Aman' : survivalTime >= 3 ? 'Waspada' : 'Kritis';
  const survivalColor = survivalTime >= 12 ? '#4ade80' : survivalTime >= 6 ? '#60a5fa' : survivalTime >= 3 ? '#f59e0b' : '#f87171';

  // Net Worth Growth & Wealth Velocity
  const nwGrowth = balance; // This month's surplus
  const prevMonthSurplus = prevInc - prevExp;
  
  // Wealth Velocity: Accelerating if current surplus > previous surplus
  // OR if we have history, compare the rate of change
  let wealthVelocity = nwGrowth - prevMonthSurplus;
  
  if (nwHistory.length >= 2) {
    const latest = nwHistory[nwHistory.length - 1].net_worth;
    const previous = nwHistory[nwHistory.length - 2].net_worth;
    const currentDelta = netWorth - latest; // Growth since last snapshot
    const previousDelta = latest - previous; // Growth between last two snapshots
    wealthVelocity = currentDelta - previousDelta;
  }

  const wealthVelocityStatus = wealthVelocity > 0 ? 'Accelerating 🚀' : wealthVelocity < 0 ? 'Decelerating 📉' : 'Stable ⚖️';
  const velocityColor = wealthVelocity > 0 ? '#4ade80' : wealthVelocity < 0 ? '#f87171' : '#6b7280';

  // Chart 30 hari (Transactions)
  const chartMap: Record<string, { income: number; expense: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    chartMap[d] = { income: 0, expense: 0 };
  }
  last30.forEach(t => { if (chartMap[t.date]) chartMap[t.date][t.type] += t.amount; });
  const chartData = Object.entries(chartMap).map(([date, v]) => ({ date, ...v }));
  const maxVal    = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 1);

  // NW History Chart Data
  const nwMaxVal = Math.max(...nwHistory.map(h => h.net_worth), netWorth, 1);
  const nwMinVal = Math.min(...nwHistory.map(h => h.net_worth), netWorth, 0);
  const nwRange = nwMaxVal - nwMinVal;

  // Future Cost Projections (Inflation: 5% per year)
  const inflationRate = 0.05;
  const costIn5Y = monthlyExpBase * Math.pow(1 + inflationRate, 5);
  const costIn10Y = monthlyExpBase * Math.pow(1 + inflationRate, 10);
  const costIn20Y = monthlyExpBase * Math.pow(1 + inflationRate, 20);

  // Opportunity Cost Calculation (Coffee Effect)
  const dailyCoffee = 50000; // Rp 50k
  const invested10Y = dailyCoffee * 30 * 12 * 10 * 1.5; // Simple 50% growth over 10y for illustrative purposes
  const invested20Y = dailyCoffee * 30 * 12 * 20 * 3.0; // Illustrative

  const monthLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const dateLabel  = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const firstName  = profile.display_name?.split(' ')[0] ?? 'Kamu';

  return (
    <div style={{ color: '#f0f0f5', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      <style>{`
        .ov-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 16px; }
        .ov-grid6 { display: grid; grid-template-columns: repeat(6,1fr); gap: 12px; margin-bottom: 12px; }
        .ov-grid2 { display: grid; grid-template-columns: 1.6fr 1fr; gap: 12px; margin-bottom: 12px; }
        
        @media (max-width: 1400px) {
          .ov-grid6 { grid-template-columns: repeat(3,1fr); }
        }
        @media (max-width: 900px) {
          .ov-grid6 { grid-template-columns: repeat(2,1fr); }
        }
        @media (max-width: 768px) {
          .ov-header { flex-direction: column; align-items: stretch; }
          .ov-grid6 { grid-template-columns: 1fr; gap: 8px; }
          .ov-grid2 { grid-template-columns: 1fr; gap: 8px; }
        }
        .ov-card { background:#111118; border:1px solid #1f1f2e; border-radius:12px; padding:16px; }
        @media (max-width: 768px) { .ov-card { padding:14px; border-radius:10px; } }
      `}</style>

      {/* Header */}
      <div className="ov-header">
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 4px', letterSpacing: '-0.4px' }}>
            Selamat datang, {firstName} 👋
          </h1>
          <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>{dateLabel}</p>
        </div>
        <div style={{ 
          background: '#111118', border: '1px solid #1f1f2e', borderRadius: '12px', 
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '14px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '2px' }}>Financial Health</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: healthColor }}>{healthLabel}</div>
          </div>
          <div style={{ 
            width: '44px', height: '44px', borderRadius: '50%', border: `3px solid ${healthColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '800',
            color: '#f0f0f5', background: 'rgba(255,255,255,0.02)'
          }}>
            {healthScore}
          </div>
        </div>
      </div>

      {/* Row 1: 6 kartu KPI */}
      <div className="ov-grid6">
        <div className="ov-card">
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Net Worth</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: netWorth >= 0 ? '#4ade80' : '#f87171', letterSpacing: '-0.5px' }}>
            {fmt(Math.abs(netWorth))}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
            {assetList.length === 0 ? 'Belum ada aset' : `Aset ${fmt(totalAsset)}`}
          </div>
        </div>
        <div className="ov-card">
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Pemasukan</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#4ade80', letterSpacing: '-0.5px' }}>{fmt(income)}</div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{monthLabel}</div>
        </div>
        <div className="ov-card">
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Pengeluaran</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#f87171', letterSpacing: '-0.5px' }}>{fmt(expense)}</div>
          <div style={{ fontSize: '11px', marginTop: '4px', color: Math.abs(expTrend) > 5 ? (expTrend > 0 ? '#f87171' : '#4ade80') : '#6b7280' }}>
            {prevExp > 0 ? `${expTrend > 0 ? '↑' : '↓'} ${Math.abs(expTrend).toFixed(0)}%` : monthLabel}
          </div>
        </div>
        <div className="ov-card">
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Saving Rate</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: savingRate > 20 ? '#4ade80' : savingRate > 10 ? '#f59e0b' : '#f87171', letterSpacing: '-0.5px' }}>
            {savingRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '11px', marginTop: '4px', color: Math.abs(savRateTrend) > 2 ? (savRateTrend > 0 ? '#4ade80' : '#f87171') : '#6b7280' }}>
            {prevInc > 0 ? `${savRateTrend > 0 ? '↑' : '↓'} ${Math.abs(savRateTrend).toFixed(1)}%` : 'vs bln lalu'}
          </div>
        </div>
        <div className="ov-card">
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Survival Time</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: survivalColor, letterSpacing: '-0.5px' }}>
            {survivalTime.toFixed(1)} <span style={{ fontSize: '12px', fontWeight: '400', color: '#6b7280' }}>bln</span>
          </div>
          <div style={{ fontSize: '11px', marginTop: '4px', color: survivalColor }}>
            {survivalLabel}
          </div>
        </div>
        <div className="ov-card">
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Burn Rate</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#f87171', letterSpacing: '-0.5px' }}>
            {fmt(burnRate)}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Avg. per bulan</div>
        </div>
      </div>

      {/* Row 2: Saldo Bar & Emergency Fund Detail */}
      <div className="ov-grid2">
        <div className="ov-card">
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

        <div className="ov-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>Financial Independence Tracker</span>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>{fmt(netWorth)} / {fmt(fiNumber)}</span>
          </div>
          <div style={{ height: '6px', background: '#1f1f2e', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '99px',
              width: `${fiProgress}%`,
              background: '#8b5cf6',
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
            <span style={{ fontSize: '11px', color: '#374151' }}>FI Number: {fmt(fiNumber)}</span>
            <span style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: '600' }}>
              {fiProgress}% Terpenuhi
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Growth & FI Progress */}
      <div className="ov-grid2" style={{ marginBottom: '12px' }}>
        <div className="ov-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          {/* Sparkline background */}
          {nwHistory.length > 2 && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', opacity: 0.1, pointerEvents: 'none' }}>
              <svg width="100%" height="100%" preserveAspectRatio="none" viewBox={`0 0 ${nwHistory.length - 1} 100`}>
                <polyline
                  fill="none"
                  stroke={nwGrowth >= 0 ? '#4ade80' : '#f87171'}
                  strokeWidth="4"
                  points={nwHistory.map((h, i) => `${i},${100 - ((h.net_worth - nwMinVal) / (nwRange || 1)) * 100}`).join(' ')}
                />
              </svg>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', position: 'relative' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>Net Worth Growth Tracker</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: nwGrowth >= 0 ? '#4ade80' : '#f87171' }}>
              {nwGrowth >= 0 ? '↑' : '↓'} {fmt(Math.abs(nwGrowth))}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>{nwHistory.length > 0 ? `Tren ${nwHistory.length} hari terakhir` : 'Pertumbuhan surplus bulan ini'}</span>
            <span style={{ fontSize: '11px', color: velocityColor, fontWeight: '500' }}>{wealthVelocityStatus}</span>
          </div>
        </div>
        <div className="ov-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>Passive Income Coverage</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: passiveIncomeCoverage >= 100 ? '#4ade80' : '#f59e0b' }}>
              {passiveIncomeCoverage}%
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>
            Estimasi pasif income ({fmt(monthlyPassiveIncome)}/bln) menutup {passiveIncomeCoverage}% biaya hidup
          </div>
        </div>
      </div>

      {/* Row 4: Emergency Fund Detail */}
      <div className="ov-card" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>Dana Darurat (Emergency Fund)</span>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>{fmt(liquidAssets)} / {fmt(efTargetMin)}</span>
        </div>
        <div style={{ height: '6px', background: '#1f1f2e', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '99px',
            width: `${efProgress}%`,
            background: efProgress >= 100 ? '#4ade80' : efProgress >= 50 ? '#f59e0b' : '#f87171',
          }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
          <span style={{ fontSize: '11px', color: '#374151' }}>Target: 6x Pengeluaran ({fmt(efTargetMin)})</span>
          <span style={{ fontSize: '11px', color: efProgress >= 100 ? '#4ade80' : '#6b7280' }}>
            {efProgress >= 100 ? 'Aman ✅' : `${fmt(efTargetMin - liquidAssets)} lagi`}
          </span>
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

      {/* Row 5: Life Event & Future Planning */}
      <div className="ov-grid2" style={{ marginBottom: '12px' }}>
        <div className="ov-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#9ca3af' }}>Future Cost Projection (Inflasi 5%)</span>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Berdasarkan pengeluaran bln ini</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Biaya hidup 5 tahun lagi</span>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>{fmt(costIn5Y)}/bln</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Biaya hidup 10 tahun lagi</span>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>{fmt(costIn10Y)}/bln</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Biaya hidup 20 tahun lagi</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#f87171' }}>{fmt(costIn20Y)}/bln</span>
            </div>
          </div>
        </div>

        <div className="ov-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#9ca3af' }}>Life Event Planner</span>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Simulasi Dana</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '500' }}>🎓 Dana Pendidikan (Anak)</span>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>Est. 15thn lagi</span>
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Butuh: ~{fmt(monthlyExpBase * 100)} (asumsi 100x biaya hidup saat ini)</div>
            </div>
            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '500' }}>🏝️ Pensiun Sederhana</span>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>FI Number</span>
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Butuh: ~{fmt(fiNumber)} (4% Safe Withdrawal Rate)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 6: Money Decision Intelligence */}
      <div className="ov-card" style={{ marginBottom: '12px', border: '1px solid #3b82f6', background: 'rgba(59,130,246,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#60a5fa' }}>🧠 Opportunity Cost Engine</span>
          <span style={{ fontSize: '11px', color: '#60a5fa' }}>Decision Support</span>
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: '1.6' }}>
          Jika Anda menyisihkan <span style={{ color: '#f0f0f5', fontWeight: '600' }}>{fmt(dailyCoffee)}</span> per hari (setara harga kopi premium) dan menginvestasikannya dengan imbal hasil moderat:
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Setelah 10 Tahun</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#4ade80' }}>~{fmt(invested10Y)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Setelah 20 Tahun</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#4ade80' }}>~{fmt(invested20Y)}</div>
            </div>
          </div>
          <div style={{ marginTop: '10px', fontSize: '11px', fontStyle: 'italic', color: '#6b7280' }}>
            *Ini adalah simulasi nilai masa depan untuk membantu Anda melihat potensi pertumbuhan aset dari pengeluaran kecil rutin.
          </div>
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
