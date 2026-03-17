// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fmt, pct, Card, KpiCard, ProgressCard } from './components/DashboardComponents';

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

  // Burn Rate & Survival Time
  const burnRate = monthlyExpBase;
  const survivalTime = burnRate > 0 ? (liquidAssets / burnRate) : 0;
  const survivalLabel = survivalTime >= 12 ? 'Sangat Aman' : survivalTime >= 6 ? 'Aman' : survivalTime >= 3 ? 'Waspada' : 'Kritis';
  const survivalColor = survivalTime >= 12 ? '#4ade80' : survivalTime >= 6 ? '#60a5fa' : survivalTime >= 3 ? '#f59e0b' : '#f87171';

  // Financial Archetype
  let archetype = 'The Balanced Strategist';
  if (savingRate > 40 && investmentRatio > 30) archetype = 'The Wealth Accelerator 🚀';
  else if (monthsCovered > 12 && debtRatio === 0) archetype = 'The Fortress 🏰';
  else if (savingRate < 10 && debtRatio > 30) archetype = 'The Overstretched ⚠️';
  else if (investmentRatio > 50) archetype = 'The Aggressive Builder 🏗️';
  else if (savingRate > 20 && monthsCovered < 3) archetype = 'The Vulnerable Earner 🛡️';

  // Total Runway (All Assets / Monthly Burn)
  const totalRunway = burnRate > 0 ? (totalAsset / burnRate) : 0;

  // Health Recommendations
  const healthRecs = [];
  if (savingRate < 20) healthRecs.push('Tingkatkan saving rate ke 20% dengan memangkas pengeluaran tersier.');
  if (monthsCovered < 6) healthRecs.push('Prioritaskan pengisian Dana Darurat hingga minimal 6x pengeluaran.');
  if (debtRatio > 30) healthRecs.push('Waspada debt ratio tinggi! Batasi cicilan baru dan percepat pelunasan hutang.');
  if (monthlyInvRatio < 15) healthRecs.push('Alokasikan minimal 15% pendapatan ke instrumen investasi produktif.');
  if (balance < 0) healthRecs.push('Cashflow negatif! Segera evaluasi pengeluaran bulan ini.');
  if (healthRecs.length === 0) healthRecs.push('Kondisi keuangan Anda luar biasa! Pertahankan gaya hidup saat ini.');

  // Lifestyle Inflation Detector
  const incChange = prevInc > 0 ? ((income - prevInc) / prevInc) * 100 : 0;
  const expChange = prevExp > 0 ? ((expense - prevExp) / prevExp) * 100 : 0;
  const lifestyleInflationDetected = expChange > incChange + 5 && expChange > 10; 
  const lifestyleStatus = lifestyleInflationDetected ? '⚠️ Terdeteksi' : '✅ Terkendali';
  const lifestyleColor = lifestyleInflationDetected ? '#f87171' : '#4ade80';

  // Asset Allocation Analysis
  const totalAssetsVal = assetList.filter(a => !a.is_liability).reduce((s, a) => s + a.value, 0);
  const cashVal = assetList.filter(a => !a.is_liability && a.type === 'cash').reduce((s, a) => s + a.value, 0);
  const invVal = assetList.filter(a => !a.is_liability && a.type === 'investment').reduce((s, a) => s + a.value, 0);
  const otherVal = totalAssetsVal - cashVal - invVal;
  const cashPct = totalAssetsVal > 0 ? Math.round((cashVal / totalAssetsVal) * 100) : 0;
  const invPct = totalAssetsVal > 0 ? Math.round((invVal / totalAssetsVal) * 100) : 0;
  const otherPct = totalAssetsVal > 0 ? Math.round((otherVal / totalAssetsVal) * 100) : 0;

  // Financial Independence (FI) Calculation
  const annualExpense = monthlyExpBase * 12;
  const fiNumber = annualExpense * 25;
  const fiProgress = fiNumber > 0 ? Math.min(pct(netWorth, fiNumber), 100) : 0;
  
  const remainingFI = Math.max(0, fiNumber - netWorth);
  const monthlySurplus = balance > 0 ? balance : 0;
  const monthsToFI = monthlySurplus > 0 ? Math.ceil(remainingFI / monthlySurplus) : Infinity;
  const yearsToFI = monthsToFI !== Infinity ? (monthsToFI / 12).toFixed(1) : '∞';

  const liabilities = assetList.filter(a => a.is_liability).sort((a, b) => a.value - b.value);
  const totalLiabVal = liabilities.reduce((s, a) => s + a.value, 0);

  const estimatedAnnualPassiveIncome = investments * 0.05;
  const monthlyPassiveIncome = estimatedAnnualPassiveIncome / 12;
  const passiveIncomeCoverage = monthlyExpBase > 0 ? Math.min(pct(monthlyPassiveIncome, monthlyExpBase), 100) : 0;

  // Net Worth Growth & Wealth Velocity
  const nwGrowth = balance;
  const prevMonthSurplus = prevInc - prevExp;
  let wealthVelocity = nwGrowth - prevMonthSurplus;
  if (nwHistory.length >= 2) {
    const latest = nwHistory[nwHistory.length - 1].net_worth;
    const previous = nwHistory[nwHistory.length - 2].net_worth;
    wealthVelocity = (netWorth - latest) - (latest - previous);
  }
  const wealthVelocityStatus = wealthVelocity > 0 ? 'Accelerating 🚀' : wealthVelocity < 0 ? 'Decelerating 📉' : 'Stable ⚖️';
  const velocityColor = wealthVelocity > 0 ? '#4ade80' : wealthVelocity < 0 ? '#f87171' : '#6b7280';

  // Charts data
  const chartMap: Record<string, { income: number; expense: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    chartMap[d] = { income: 0, expense: 0 };
  }
  last30.forEach(t => { if (chartMap[t.date]) chartMap[t.date][t.type] += t.amount; });
  const chartData = Object.entries(chartMap).map(([date, v]) => ({ date, ...v }));
  const maxVal    = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 1);

  const nwMaxVal = Math.max(...nwHistory.map(h => h.net_worth), netWorth, 1);
  const nwMinVal = Math.min(...nwHistory.map(h => h.net_worth), netWorth, 0);
  const nwRange = nwMaxVal - nwMinVal;

  // Spending Efficiency
  const needsKeywords = ['makan', 'transport', 'sewa', 'utilitas', 'listrik', 'air', 'internet', 'cicilan', 'sekolah', 'asuransi', 'kesehatan'];
  const needsSum = txs.filter(t => t.type === 'expense' && needsKeywords.some(k => (t.categories?.name ?? '').toLowerCase().includes(k))).reduce((s, t) => s + t.amount, 0);
  const wantsSum = expense - needsSum;
  const spendingEfficiency = expense > 0 ? (needsSum / expense) * 100 : 0;
  const efficiencyLabel = spendingEfficiency <= 50 ? 'Sangat Efisien' : spendingEfficiency <= 70 ? 'Wajar' : 'Banyak Keinginan';

  // Milestones
  const milestones = [10000000, 50000000, 100000000, 500000000, 1000000000];
  const nextMilestone = milestones.find(m => m > netWorth) || milestones[milestones.length - 1];
  const milestoneProgress = Math.min(pct(netWorth, nextMilestone), 100);

  // Subscriptions
  const subMap: Record<string, number> = {};
  last30.filter(t => t.type === 'expense').forEach(t => {
    const key = `${t.categories?.name ?? 'Lain'}-${t.amount}`;
    subMap[key] = (subMap[key] ?? 0) + 1;
  });
  const suspectedSubs = Object.entries(subMap).filter(([_, count]) => count >= 2).map(([key]) => ({ name: key.split('-')[0], amount: Number(key.split('-')[1]) }));

  // Future Cost & Opportunity Cost
  const inflationRate = 0.05;
  const costIn5Y = monthlyExpBase * Math.pow(1 + inflationRate, 5);
  const costIn10Y = monthlyExpBase * Math.pow(1 + inflationRate, 10);
  const costIn20Y = monthlyExpBase * Math.pow(1 + inflationRate, 20);

  const dailyCoffee = 50000;
  const invested10Y = dailyCoffee * 30 * 12 * 10 * 1.5;
  const invested20Y = dailyCoffee * 30 * 12 * 20 * 3.0;

  // Big Purchase Simulator
  const bigPurchaseSample = 500000000;
  const delayInYears = monthlySurplus > 0 ? (((fiNumber - (netWorth - bigPurchaseSample)) / monthlySurplus) - monthsToFI) / 12 : 0;

  const monthLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const dateLabel  = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const firstName  = profile.display_name?.split(' ')[0] ?? 'Kamu';

  return (
    <div style={{ color: '#f0f0f5', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      <style>{`
        .ov-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 16px; }
        .ov-grid6 { display: grid; grid-template-columns: repeat(6,1fr); gap: 12px; margin-bottom: 12px; }
        .ov-grid2 { display: grid; grid-template-columns: 1.6fr 1fr; gap: 12px; margin-bottom: 12px; }
        @media (max-width: 1400px) { .ov-grid6 { grid-template-columns: repeat(3,1fr); } }
        @media (max-width: 900px) { .ov-grid6 { grid-template-columns: repeat(2,1fr); } }
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
            <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '2px' }}>Archetype: {archetype}</div>
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

      {/* Recommendations */}
      <Card style={{ marginBottom: '12px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '20px' }}>💡</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#f59e0b', marginBottom: '4px' }}>Rekomendasi Konsultan Finansial</div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#9ca3af', lineHeight: '1.6' }}>
              {healthRecs.map((rec, i) => <li key={i} style={{ marginBottom: '2px' }}>{rec}</li>)}
            </ul>
          </div>
        </div>
      </Card>

      {/* Row 1: KPI Grid */}
      <div className="ov-grid6">
        <KpiCard label="Net Worth" value={fmt(Math.abs(netWorth))} subValue={assetList.length === 0 ? 'Belum ada aset' : `Aset ${fmt(totalAsset)}`} valueColor={netWorth >= 0 ? '#4ade80' : '#f87171'} />
        <KpiCard label="Pemasukan" value={fmt(income)} subValue={monthLabel} valueColor="#4ade80" />
        <KpiCard label="Pengeluaran" value={fmt(expense)} subValue={prevExp > 0 ? `${expTrend > 0 ? '↑' : '↓'} ${Math.abs(expTrend).toFixed(0)}%` : monthLabel} valueColor="#f87171" subColor={Math.abs(expTrend) > 5 ? (expTrend > 0 ? '#f87171' : '#4ade80') : '#6b7280'} />
        <KpiCard label="Saving Rate" value={`${savingRate.toFixed(1)}%`} subValue={prevInc > 0 ? `${savRateTrend > 0 ? '↑' : '↓'} ${Math.abs(savRateTrend).toFixed(1)}%` : 'vs bln lalu'} valueColor={savingRate > 20 ? '#4ade80' : savingRate > 10 ? '#f59e0b' : '#f87171'} subColor={Math.abs(savRateTrend) > 2 ? (savRateTrend > 0 ? '#4ade80' : '#f87171') : '#6b7280'} />
        <KpiCard label="Survival Time" value={`${survivalTime.toFixed(1)} bln`} subValue={`${survivalLabel} (Total: ${totalRunway.toFixed(1)} bln)`} valueColor={survivalColor} subColor={survivalColor} />
        <KpiCard label="Burn Rate" value={fmt(burnRate)} subValue="Avg. per bulan" valueColor="#f87171" />
      </div>

      {/* Row 2: Status Bars */}
      <div className="ov-grid2">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>Saldo Bersih {monthLabel}</span>
            <span style={{ fontSize: '15px', fontWeight: '700', color: balance >= 0 ? '#4ade80' : '#f87171' }}>{balance >= 0 ? '+' : '-'}{fmt(Math.abs(balance))}</span>
          </div>
          {income > 0 && (
            <div style={{ height: '6px', background: '#1f1f2e', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '99px', width: `${Math.min(pct(expense, income), 100)}%`, background: pct(expense, income) > 90 ? '#ef4444' : pct(expense, income) > 70 ? '#f59e0b' : '#2563eb' }}/>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
            <span style={{ fontSize: '11px', color: '#374151' }}>{income > 0 ? `${pct(expense, income)}% pemasukan terpakai` : 'Belum ada pemasukan'}</span>
            <span style={{ fontSize: '11px', color: '#374151' }}>{txs.length} transaksi</span>
          </div>
        </Card>
        <ProgressCard label="Financial Independence Tracker" current={netWorth} target={fiNumber} progress={fiProgress} color="#8b5cf6" footerLeft={`FI Number: ${fmt(fiNumber)}`} footerRight={<span style={{ fontSize: '10px', color: '#6b7280' }}>Est. {yearsToFI} tahun lagi (surplus {fmt(monthlySurplus)}/bln)</span>} />
      </div>

      {/* Row 3: Intelligence Modules */}
      <div className="ov-grid6">
        <Card style={{ gridColumn: 'span 2', position: 'relative', overflow: 'hidden' }}>
          {nwHistory.length > 2 && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', opacity: 0.1, pointerEvents: 'none' }}>
              <svg width="100%" height="100%" preserveAspectRatio="none" viewBox={`0 0 ${nwHistory.length - 1} 100`}>
                <polyline fill="none" stroke={nwGrowth >= 0 ? '#4ade80' : '#f87171'} strokeWidth="4" points={nwHistory.map((h, i) => `${i},${100 - ((h.net_worth - nwMinVal) / (nwRange || 1)) * 100}`).join(' ')} />
              </svg>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>Net Worth Growth</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: nwGrowth >= 0 ? '#4ade80' : '#f87171' }}>{nwGrowth >= 0 ? '↑' : '↓'} {fmt(Math.abs(nwGrowth))}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>{nwHistory.length > 0 ? `Tren ${nwHistory.length} hari` : 'Bulan ini'}</span>
            <span style={{ fontSize: '11px', color: velocityColor, fontWeight: '500' }}>{wealthVelocityStatus}</span>
          </div>
        </Card>
        <Card style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>Passive Income Coverage</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: passiveIncomeCoverage >= 100 ? '#4ade80' : '#f59e0b' }}>{passiveIncomeCoverage}%</span>
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>Pasif income {fmt(monthlyPassiveIncome)}/bln</div>
        </Card>
        <Card style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>Lifestyle Inflation</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: lifestyleColor }}>{lifestyleStatus}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>Pengeluaran {expChange > 0 ? `naik ${expChange.toFixed(0)}%` : 'stabil'}</div>
        </Card>
      </div>

      {/* Row 4: Debt & EF */}
      <div className="ov-grid2">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>Debt Snowball</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#f87171' }}>{fmt(totalLiabVal)}</span>
          </div>
          {liabilities.length === 0 ? <div style={{ textAlign: 'center', padding: '12px 0', color: '#4ade80', fontSize: '12px' }}>✅ Bebas Hutang</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {liabilities.map((l, i) => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: i === 0 ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)', borderRadius: '8px', border: i === 0 ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>{i + 1}. {l.name}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>{fmt(l.value)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <ProgressCard label="Emergency Fund" current={liquidAssets} target={efTargetMin} progress={efProgress} color={efProgress >= 100 ? '#4ade80' : efProgress >= 50 ? '#f59e0b' : '#f87171'} footerLeft={`Target: 6x (${fmt(efTargetMin)})`} footerRight={<span style={{ fontSize: '11px', color: '#6b7280' }}>{efProgress >= 100 ? 'Aman ✅' : `${fmt(efTargetMin - liquidAssets)} lagi`}</span>} />
      </div>

      {/* Row 5: Analytics & Goals */}
      <div className="ov-grid2">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#9ca3af' }}>30 Hari Terakhir</span>
            <div style={{ display: 'flex', gap: '10px', fontSize: '11px' }}>
              <span style={{ color: '#4ade80' }}>● Masuk</span>
              <span style={{ color: '#f87171' }}>● Keluar</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '80px' }}>
            {chartData.map((d, i) => {
              const incH = Math.round((d.income / maxVal) * 76);
              const expH = Math.round((d.expense / maxVal) * 76);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', gap: '1px', alignItems: 'flex-end', height: '80px' }}>
                  {d.income > 0 && <div style={{ flex: 1, height: `${Math.max(incH, 2)}px`, background: '#166534', borderRadius: '1px 1px 0 0' }}/>}
                  {d.expense > 0 && <div style={{ flex: 1, height: `${Math.max(expH, 2)}px`, background: '#7f1d1d', borderRadius: '1px 1px 0 0' }}/>}
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#9ca3af' }}>Goals</span>
            <a href="/dashboard/goals" style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'none' }}>Semua →</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {goalList.map(g => {
              const p = pct(g.current_amount, g.target_amount);
              return (
                <div key={g.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '500' }}>{g.icon} {g.name}</span>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>{p}%</span>
                  </div>
                  <div style={{ height: '4px', background: '#1f1f2e', borderRadius: '99px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${p}%`, background: p >= 100 ? '#4ade80' : '#2563eb' }}/></div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Row 6: Simulators */}
      <div className="ov-grid2">
        <Card style={{ border: '1px solid #3b82f6', background: 'rgba(59,130,246,0.05)' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#60a5fa', marginBottom: '12px' }}>🧠 Opportunity Cost</div>
          <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: '1.6' }}>
            Investasi {fmt(dailyCoffee)}/hari (kopi):
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>10 THN</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#4ade80' }}>~{fmt(invested10Y)}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>20 THN</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#4ade80' }}>~{fmt(invested20Y)}</div>
              </div>
            </div>
          </div>
        </Card>
        <Card style={{ border: '1px solid #ec4899', background: 'rgba(236,72,153,0.05)' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#f472b6', marginBottom: '12px' }}>🛍️ Big Purchase Simulator</div>
          <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: '1.6' }}>
            Beli {fmt(bigPurchaseSample)} tunai:
            <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(236,72,153,0.2)' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#f87171' }}>Pensiun tertunda {delayInYears.toFixed(1)} thn ⏳</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 7: Efficiency & Assets */}
      <div className="ov-grid2">
        <Card style={{ border: suspectedSubs.length > 0 ? '1px solid #f59e0b' : '1px solid #1f1f2e' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: suspectedSubs.length > 0 ? '#f59e0b' : '#9ca3af', marginBottom: '12px' }}>🕵️ Subscriptions</div>
          {suspectedSubs.length === 0 ? <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>Tidak ada langganan terdeteksi</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {suspectedSubs.map((sub, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', background: 'rgba(245,158,11,0.05)', borderRadius: '6px' }}><span style={{ fontSize: '12px' }}>{sub.name}</span><span style={{ fontSize: '12px', fontWeight: '600' }}>{fmt(sub.amount)}</span></div>)}
            </div>
          )}
        </Card>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>Asset Allocation</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#4ade80' }}>{cashPct}% Kas</span>
          </div>
          <div style={{ height: '24px', background: '#1f1f2e', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${cashPct}%`, background: '#4ade80' }}/>
            <div style={{ width: `${invPct}%`, background: '#2563eb' }}/>
            <div style={{ width: `${otherPct}%`, background: '#6b7280' }}/>
          </div>
        </Card>
      </div>

      {/* Row 8: Milestones */}
      <Card style={{ marginBottom: '12px', background: 'linear-gradient(135deg, #111118 0%, #1a1a2e 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#8b5cf6' }}>🏆 Net Worth Milestones</span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Next: {fmt(nextMilestone)}</span>
        </div>
        <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${milestoneProgress}%`, background: 'linear-gradient(90deg, #8b5cf6 0%, #d946ef 100%)' }}/>
        </div>
      </Card>

      {/* Top Categories */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>Top Pengeluaran {monthLabel}</span>
          <a href="/dashboard/transactions" style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'none' }}>Semua →</a>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {topCats.map(([cat, amt], i) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span style={{ fontSize: '13px' }}>{cat}</span><span style={{ fontSize: '12px', color: '#9ca3af' }}>{fmt(amt)}</span></div>
                <div style={{ height: '4px', background: '#1f1f2e', borderRadius: '99px' }}><div style={{ height: '100%', width: `${pct(amt, expense)}%`, background: '#2563eb' }}/></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
