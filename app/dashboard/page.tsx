// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, KpiCard, ProgressCard } from './components/DashboardComponents';
import { 
  fmt, pct, 
  calculateMonthlyExpBase, 
  calculateYearsToFI, 
  calculateHealthScore, 
  detectArchetype,
  calculateWorkHourCost,
  detectSubscriptions,
  detectAnomalies,
  forecastEndOfMonth
} from '@/lib/finance-logic';

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

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, display_name, telegram_chat_id, role, saving_target, wants_target, needs_target')
    .eq('email', user.email!)
    .maybeSingle();

  // Jika error (misal kolom belum ada), coba fetch tanpa kolom target baru
  let safeProfile = profile;
  if (profileError || !profile) {
    const { data: retryProfile } = await supabase
      .from('users')
      .select('id, display_name, telegram_chat_id, role')
      .eq('email', user.email!)
      .maybeSingle();
    
    if (!retryProfile) redirect('/login');
    
    safeProfile = {
      id: retryProfile.id,
      display_name: retryProfile.display_name,
      telegram_chat_id: retryProfile.telegram_chat_id,
      role: retryProfile.role,
      saving_target: 20,
      wants_target: 30,
      needs_target: 50
    };
  }

  // Double check for TS satisfaction
  if (!safeProfile) redirect('/login');

  const userId = safeProfile.id;
  const userRole = safeProfile.role || 'user';
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
  const olderMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
  const olderMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0).toISOString().split('T')[0];

  const [txMonth, txPrev, txOlder, txLast30, goals, assets, history] = await Promise.all([
    supabase.from('transactions').select('amount, type, date, categories(name)')
      .eq('user_id', userId).eq('is_deleted', false).gte('date', monthStart),
    supabase.from('transactions').select('amount, type')
      .eq('user_id', userId).eq('is_deleted', false)
      .gte('date', prevMonthStart).lte('date', prevMonthEnd),
    supabase.from('transactions').select('amount, type')
      .eq('user_id', userId).eq('is_deleted', false)
      .gte('date', olderMonthStart).lte('date', olderMonthEnd),
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
  const olderTxs = (txOlder.data ?? []) as unknown as Transaction[];
  const last30   = (txLast30.data ?? []) as unknown as Transaction[];
  const goalList = (goals.data ?? []) as Goal[];
  const assetList = (assets.data ?? []) as Asset[];
  const nwHistory = (history.data ?? []) as { date: string; net_worth: number }[];

  // Basic Totals
  const income   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense  = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance  = income - expense;
  const savingRate = income > 0 ? ((income - expense) / income) * 100 : 0;

  const prevExp  = prevTxs.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
  const prevInc  = prevTxs.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
  const prevSavRate = prevInc > 0 ? ((prevInc - prevExp) / prevInc) * 100 : 0;
  
  const olderExp = olderTxs.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);

  // Logic Upgrade: Stable Monthly Expense (Average of last 3 months)
  const monthlyExpBase = calculateMonthlyExpBase(expense, prevExp, olderExp);
  const burnRate = monthlyExpBase;

  const expTrend = prevExp > 0 ? ((expense - prevExp) / prevExp) * 100 : 0;
  const savRateTrend = savingRate - prevSavRate;

  // Assets & Net Worth
  const totalAsset = assetList.filter(a => !a.is_liability).reduce((s, a) => s + a.value, 0);
  const totalLiab  = assetList.filter(a => a.is_liability).reduce((s, a) => s + a.value, 0);
  const netWorth   = totalAsset - totalLiab;

  const investments = assetList.filter(a => !a.is_liability && a.type === 'investment').reduce((s, a) => s + a.value, 0);
  const liquidAssets = assetList.filter(a => !a.is_liability && a.type === 'cash').reduce((s, a) => s + a.value, 0);
  
  const monthlyInvRatio = income > 0 ? (txs.filter(t => t.type === 'expense' && t.categories?.name?.toLowerCase().includes('invest')).reduce((s, t) => s + t.amount, 0) / income) * 100 : 0;
  const investmentRatio = income > 0 ? (investments / (income * 12)) * 100 : 0;

  // Emergency Fund
  const efTargetMin = monthlyExpBase * 6;
  const efProgress = efTargetMin > 0 ? Math.min(pct(liquidAssets, efTargetMin), 100) : 0;
  const monthsCovered = monthlyExpBase > 0 ? (liquidAssets / monthlyExpBase) : 0;

  // Health Score & Archetype using Utility
  const { score: healthScore, label: healthLabel, color: healthColor } = calculateHealthScore({
    savingRate, monthsCovered, 
    debtRatio: income > 0 ? (txs.filter(t => t.type === 'expense' && t.categories?.name?.toLowerCase().includes('cicilan')).reduce((s, t) => s + t.amount, 0) / income) * 100 : 0,
    monthlyInvRatio,
    isSurplus: balance > 0,
    targets: {
      saving: safeProfile.saving_target || 20,
      wants: safeProfile.wants_target || 30,
      needs: safeProfile.needs_target || 50
    }
  });

  // NEW: Lazy Cash & Spending Ratio Detection
  const lazyCash = (liquidAssets > (monthlyExpBase * 12)) ? { 
    isLazy: true, 
    amount: liquidAssets - (monthlyExpBase * 12) 
  } : { isLazy: false, amount: 0 };

  const needsKeywords = ['makan', 'transport', 'sewa', 'utilitas', 'listrik', 'air', 'internet', 'cicilan', 'sekolah', 'asuransi', 'kesehatan'];
  const needsSum = txs.filter(t => t.type === 'expense' && needsKeywords.some(k => (t.categories?.name ?? '').toLowerCase().includes(k))).reduce((s, t) => s + t.amount, 0);
  const wantsSum = expense - needsSum;
  const savingsSum = balance > 0 ? balance : 0;
  
  const spendingRatio = income > 0 ? {
    needs: Math.round((needsSum / income) * 100),
    wants: Math.round((wantsSum / income) * 100),
    savings: Math.round((savingsSum / income) * 100)
  } : { needs: 0, wants: 0, savings: 0 };

  const archetype = detectArchetype({ savingRate, investmentRatio, monthsCovered, debtRatio: 0 }); // Simplifying debtRatio for archetype
  const totalRunway = burnRate > 0 ? (totalAsset / burnRate) : 0;
  const survivalTime = burnRate > 0 ? (liquidAssets / burnRate) : 0;
  const survivalLabel = survivalTime >= 12 ? 'Sangat Aman' : survivalTime >= 6 ? 'Aman' : survivalTime >= 3 ? 'Waspada' : 'Kritis';
  const survivalColor = survivalTime >= 12 ? '#4ade80' : survivalTime >= 6 ? '#60a5fa' : survivalTime >= 3 ? '#f59e0b' : '#f87171';

  // Health Recommendations
  const healthRecs = [];
  if (lazyCash.isLazy) healthRecs.push(`Uang Anda 'mengendap' berlebihan (${fmt(lazyCash.amount)}). Segera investasikan agar produktif!`);
  if (spendingRatio.wants > 30) healthRecs.push(`Peringatan: Pengeluaran 'Keinginan' (${spendingRatio.wants}%) melebihi batas ideal 30%.`);
  if (savingRate < 20) healthRecs.push('Tingkatkan saving rate ke 20% dengan memangkas pengeluaran tersier.');
  if (monthsCovered < 6) healthRecs.push('Prioritaskan pengisian Dana Darurat hingga minimal 6x pengeluaran.');
  if (balance < 0) healthRecs.push('Cashflow negatif! Segera evaluasi pengeluaran bulan ini.');
  if (healthRecs.length === 0) healthRecs.push('Kondisi keuangan Anda luar biasa! Pertahankan gaya hidup saat ini.');

  // FI Calculation using Utility (Compound Interest)
  const annualExpense = monthlyExpBase * 12;
  const fiNumber = annualExpense * 25;
  const fiProgress = fiNumber > 0 ? Math.min(pct(netWorth, fiNumber), 100) : 0;
  const monthlySurplus = balance > 0 ? balance : 0;
  const yearsToFI = calculateYearsToFI(netWorth, fiNumber, monthlySurplus);

  // Other Logic (Lifestyle, Milestones, Subs, etc. - can be refactored further if needed)
  const expChange = prevExp > 0 ? ((expense - prevExp) / prevExp) * 100 : 0;
  const lifestyleStatus = (expChange > (prevInc > 0 ? ((income - prevInc) / prevInc) * 100 : 0) + 5 && expChange > 10) ? '⚠️ Terdeteksi' : '✅ Terkendali';
  const lifestyleColor = lifestyleStatus.includes('⚠️') ? '#f87171' : '#4ade80';

  const cashPct = totalAsset > 0 ? Math.round((liquidAssets / totalAsset) * 100) : 0;
  const invPct = totalAsset > 0 ? Math.round((investments / totalAsset) * 100) : 0;
  const otherPct = 100 - cashPct - invPct;

  const liabilities = assetList.filter(a => a.is_liability);
  const totalLiabVal = totalLiab;

  // New: Step A, B, C Analysis
  const debtRatio = income > 0 ? (txs.filter(t => t.type === 'expense' && t.categories?.name?.toLowerCase().includes('cicilan')).reduce((s, t) => s + t.amount, 0) / income) * 100 : 0;
  const dailyBudget = monthlyExpBase > 0 ? (monthlyExpBase / 30) : 0;
  const anomaly = detectAnomalies(txs, dailyBudget * 1.5); // 50% di atas budget harian dianggap anomali
  const forecast = forecastEndOfMonth(income, expense);

  // New: Psikologi & Subscription
  const hourlyRate = income > 0 ? (income / 160) : 0;
  const avgExpenseWorkHours = calculateWorkHourCost(expense, income);
  const subs = detectSubscriptions(txs);
  const totalSubs = subs.reduce((s, b) => s + b.amount, 0);

  const dailyCoffee = 40000;
  const invested10Y = dailyCoffee * 30 * 155.2; // 10 years at 7% compound approx
  const invested20Y = dailyCoffee * 30 * 520.9; // 20 years at 7% compound approx
  const bigPurchaseSample = 100000000;
  const delayInYears = monthlySurplus > 0 ? (bigPurchaseSample / monthlySurplus) / 12 : 0;
  const nextMilestone = netWorth <= 0 ? 100000000 : Math.pow(10, Math.ceil(Math.log10(netWorth + 1)));
  const milestoneProgress = Math.min(pct(netWorth, nextMilestone), 100);

  // Chart data setup
  const chartMap: Record<string, { income: number; expense: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    chartMap[d] = { income: 0, expense: 0 };
  }
  last30.forEach(t => { if (chartMap[t.date]) chartMap[t.date][t.type] += t.amount; });
  const chartData = Object.entries(chartMap).map(([date, v]) => ({ date, ...v }));
  const maxVal    = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 1);

  const suspectedSubs = Object.entries(
    last30.filter(t => t.type === 'expense').reduce((acc: Record<string, number>, t) => {
      const key = `${t.categories?.name ?? 'Lain'}-${t.amount}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {})
  ).filter(([_, count]) => count >= 2).map(([key]) => ({ name: key.split('-')[0], amount: Number(key.split('-')[1]) }));

  const monthLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const dateLabel  = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const firstName  = safeProfile.display_name?.split(' ')[0] ?? 'Kamu';

  // Spending Efficiency Logic Replacement for Ratio Visualization
  const spendingEfficiency = expense > 0 ? (needsSum / expense) * 100 : 0;
  const efficiencyLabel = spendingEfficiency <= 50 ? 'Sangat Efisien' : spendingEfficiency <= 70 ? 'Wajar' : 'Banyak Keinginan';

  return (
    <div style={{ color: '#f0f0f5', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      <style>{`
        .ov-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; }
        .ov-section-title { font-size: 14px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin: 24px 0 12px; display: flex; align-items: center; gap: 8px; }
        .ov-section-title::after { content: ""; flex: 1; height: 1px; background: #1f1f2e; }
        .ov-grid6 { display: grid; grid-template-columns: repeat(6,1fr); gap: 12px; margin-bottom: 12px; }
        .ov-grid2 { display: grid; grid-template-columns: 1.6fr 1fr; gap: 12px; margin-bottom: 12px; }
        .ov-grid3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 12px; }
        @media (max-width: 1400px) { 
          .ov-grid6 { grid-template-columns: repeat(3,1fr); }
          .ov-grid3 { grid-template-columns: repeat(2,1fr); }
        }
        @media (max-width: 900px) { 
          .ov-grid6 { grid-template-columns: repeat(2,1fr); }
          .ov-grid3 { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .ov-header { flex-direction: column; align-items: stretch; }
          .ov-grid6 { grid-template-columns: 1fr; gap: 8px; }
          .ov-grid2 { grid-template-columns: 1fr; gap: 8px; }
          .ov-grid3 { grid-template-columns: 1fr; gap: 8px; }
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

      {/* Step A: Anomaly Alert */}
      {anomaly.isAnomaly && (
        <Card style={{ marginBottom: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ fontSize: '24px' }}>🚨</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#f87171' }}>Peringatan: Pengeluaran Hari Ini Melonjak!</div>
              <div style={{ fontSize: '12px', color: '#fca5a5' }}>
                Total: <strong>{fmt(anomaly.amount)}</strong> (Melebihi budget harian <strong>{fmt(anomaly.limit)}</strong> sebesar <strong>{fmt(anomaly.diff)}</strong>).
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Recommendations */}
      <Card style={{ marginBottom: '12px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '20px' }}>💡</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#f59e0b' }}>Rekomendasi Konsultan Finansial</div>
              <a href="/dashboard/intelligence" style={{ fontSize: '11px', color: '#60a5fa', textDecoration: 'none' }}>Lihat Formula Perhitungan →</a>
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#9ca3af', lineHeight: '1.6' }}>
              {healthRecs.map((rec, i) => <li key={i} style={{ marginBottom: '2px' }}>{rec}</li>)}
            </ul>
          </div>
        </div>
      </Card>

      {/* SECTION 1: THE PROTECTOR (Safety First) */}
      <div className="ov-section-title">The Protector (Keamanan) 🛡️</div>
      <div className="ov-grid3">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>Cashflow Forecast (Est. Akhir Bulan)</span>
            <span style={{ fontSize: '15px', fontWeight: '700', color: forecast.isNegative ? '#f87171' : '#4ade80' }}>
              {forecast.isNegative ? 'Defisit' : 'Surplus'} {fmt(Math.abs(forecast.predictedBalance))}
            </span>
          </div>
          <div style={{ height: '6px', background: '#1f1f2e', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', borderRadius: '99px', 
              width: `${Math.min(pct(forecast.predictedTotalExp, income), 100)}%`, 
              background: forecast.isNegative ? '#ef4444' : '#2563eb' 
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Prediksi total: {fmt(forecast.predictedTotalExp)}</span>
            <span style={{ fontSize: '10px', color: '#374151', fontStyle: 'italic' }}>Akurasi {forecast.confidence}</span>
          </div>
        </Card>
        <ProgressCard 
          label="Debt-to-Income (Batas Aman 30%)" 
          current={debtRatio} 
          target={30} 
          progress={Math.min((debtRatio / 30) * 100, 100)} 
          color={debtRatio > 35 ? '#ef4444' : debtRatio > 30 ? '#f59e0b' : '#10b981'} 
          footerLeft={`Rasio: ${debtRatio.toFixed(1)}%`} 
          footerRight={<span style={{ fontSize: '10px', color: '#6b7280' }}>{debtRatio > 30 ? 'Bahaya!' : 'Terkendali'}</span>} 
        />
        <ProgressCard 
          label="Dana Darurat (Safety Net)" 
          current={liquidAssets} 
          target={efTargetMin} 
          progress={efProgress} 
          color={efProgress >= 100 ? '#4ade80' : efProgress >= 50 ? '#f59e0b' : '#f87171'} 
          footerLeft={`Target: 6x Exp`} 
          footerRight={<span style={{ fontSize: '11px', color: '#6b7280' }}>{efProgress >= 100 ? 'Aman ✅' : `${fmt(efTargetMin - liquidAssets)} lagi`}</span>} 
        />
      </div>

      {/* SECTION 2: THE REALITY (Current Status) */}
      <div className="ov-section-title">The Reality (Kondisi Saat Ini) 📊</div>
      <div className="ov-grid6">
        <KpiCard label="Kekayaan Bersih" value={fmt(Math.abs(netWorth))} subValue={`Total Aset ${fmt(totalAsset)}`} valueColor={netWorth >= 0 ? '#4ade80' : '#f87171'} />
        <KpiCard label="Pemasukan" value={fmt(income)} subValue={`Bulan ${monthLabel}`} valueColor="#4ade80" />
        <KpiCard label="Pengeluaran" value={fmt(expense)} subValue={prevExp > 0 ? `${expTrend > 0 ? '↑' : '↓'} ${Math.abs(expTrend).toFixed(0)}%` : `Bulan ${monthLabel}`} valueColor="#f87171" subColor={Math.abs(expTrend) > 5 ? (expTrend > 0 ? '#f87171' : '#4ade80') : '#6b7280'} />
        <KpiCard label="Saving Rate" value={`${savingRate.toFixed(1)}%`} subValue={prevInc > 0 ? `${savRateTrend > 0 ? '↑' : '↓'} ${Math.abs(savRateTrend).toFixed(1)}%` : 'Target > 20%'} valueColor={savingRate > 20 ? '#4ade80' : savingRate > 10 ? '#f59e0b' : '#f87171'} subColor={Math.abs(savRateTrend) > 2 ? (savRateTrend > 0 ? '#4ade80' : '#f87171') : '#6b7280'} />
        <KpiCard label="Survival Time" value={`${survivalTime.toFixed(1)} bln`} subValue={`${survivalLabel}`} valueColor={survivalColor} subColor={survivalColor} />
        <KpiCard label="Burn Rate" value={fmt(burnRate)} subValue="Rata-rata 3 bln" valueColor="#f87171" />
      </div>
      
      <div className="ov-grid2">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>Realisasi Saldo {monthLabel}</span>
            <span style={{ fontSize: '15px', fontWeight: '700', color: balance >= 0 ? '#4ade80' : '#f87171' }}>{balance >= 0 ? '+' : '-'}{fmt(Math.abs(balance))}</span>
          </div>
          {income > 0 && (
            <div style={{ height: '6px', background: '#1f1f2e', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '99px', width: `${Math.min(pct(expense, income), 100)}%`, background: pct(expense, income) > 90 ? '#ef4444' : pct(expense, income) > 70 ? '#f59e0b' : '#2563eb' }}/>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
            <span style={{ fontSize: '11px', color: '#374151' }}>{income > 0 ? `${pct(expense, income)}% terpakai` : 'Belum ada pemasukan'}</span>
            <span style={{ fontSize: '11px', color: '#374151' }}>{txs.length} transaksi</span>
          </div>
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Card>
            <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Inflasi Gaya Hidup</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: lifestyleColor }}>{lifestyleStatus}</div>
          </Card>
          <Card style={{ border: suspectedSubs.length > 0 ? '1px solid #f59e0b' : '1px solid #1f1f2e' }}>
            <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Langganan</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: suspectedSubs.length > 0 ? '#f59e0b' : '#4ade80' }}>
              {suspectedSubs.length} Aktif
            </div>
          </Card>
        </div>
      </div>

      {/* SECTION 3: THE JOURNEY (Long-term Goals) */}
      <div className="ov-section-title">The Journey (Masa Depan) 🚀</div>
      <div className="ov-grid2">
        <ProgressCard 
          label="Kebebasan Finansial (Financial Independence)" 
          current={netWorth} 
          target={fiNumber} 
          progress={fiProgress} 
          color="#8b5cf6" 
          footerLeft={`Target: ${fmt(fiNumber)}`} 
          footerRight={<span style={{ fontSize: '10px', color: '#6b7280' }}>Est. {yearsToFI} thn lagi</span>} 
        />
        <Card style={{ position: 'relative', overflow: 'hidden' }}>
          {nwHistory.length > 2 && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', opacity: 0.1, pointerEvents: 'none' }}>
              <svg width="100%" height="100%" preserveAspectRatio="none" viewBox={`0 0 ${nwHistory.length - 1} 100`}>
                <polyline fill="none" stroke={balance >= 0 ? '#4ade80' : '#f87171'} strokeWidth="4" points={nwHistory.map((h, i) => `${i},${100 - ((h.net_worth - Math.min(...nwHistory.map(x => x.net_worth))) / (Math.max(...nwHistory.map(x => x.net_worth)) - Math.min(...nwHistory.map(x => x.net_worth)) || 1)) * 100}`).join(' ')} />
              </svg>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>Pertumbuhan Kekayaan</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: balance >= 0 ? '#4ade80' : '#f87171' }}>{balance >= 0 ? '↑' : '↓'} {fmt(Math.abs(balance))}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>{balance >= 0 ? 'Akselerasi 🚀' : 'Deselerasi 📉'}</span>
          </div>
        </Card>
      </div>

      <div className="ov-grid3">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#9ca3af' }}>Goals Utama</span>
            <a href="/dashboard/goals" style={{ fontSize: '11px', color: '#60a5fa', textDecoration: 'none' }}>Lihat →</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {goalList.slice(0, 2).map(g => {
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
        <Card style={{ background: 'linear-gradient(135deg, #111118 0%, #1a1a2e 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#8b5cf6' }}>🏆 Milestone</span>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>{fmt(nextMilestone)}</span>
          </div>
          <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ height: '100%', width: `${milestoneProgress}%`, background: 'linear-gradient(90deg, #8b5cf6 0%, #d946ef 100%)' }}/>
          </div>
          <div style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center' }}>{milestoneProgress.toFixed(0)}% menuju target berikut</div>
        </Card>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>Alokasi Aset</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#4ade80' }}>{cashPct}% Kas</span>
          </div>
          <div style={{ height: '12px', background: '#1f1f2e', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '8px' }}>
            <div style={{ width: `${cashPct}%`, background: '#4ade80' }}/>
             <div style={{ width: `${invPct}%`, background: '#2563eb' }}/>
             <div style={{ width: `${otherPct}%`, background: '#6b7280' }}/>
           </div>
           <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
             <div style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '6px', height: '6px', background: '#4ade80' }}/> Kas</div>
             <div style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '6px', height: '6px', background: '#2563eb' }}/> Invest</div>
             <div style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '6px', height: '6px', background: '#6b7280' }}/> Lain</div>
           </div>
        </Card>
      </div>

      {/* SECTION 4: THE LAB (Simulators) */}
      <div className="ov-section-title">The Lab (Simulasi & Eksperimen) 🧠</div>
      <div className="ov-grid2">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Card style={{ border: '1px solid #3b82f6', background: 'rgba(59,130,246,0.05)' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#60a5fa', marginBottom: '8px' }}>Biaya Peluang ☕</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Jika {fmt(dailyCoffee)}/hari diinvestasikan:</div>
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#4ade80' }}>~{fmt(invested20Y)}</div>
              <div style={{ fontSize: '9px', color: '#6b7280' }}>Dalam 20 Tahun (ROI 7%)</div>
            </div>
          </Card>
          <Card style={{ border: '1px solid #ec4899', background: 'rgba(236,72,153,0.05)' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#f472b6', marginBottom: '8px' }}>Efek Belanja Besar 🛍️</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Beli {fmt(bigPurchaseSample)} tunai:</div>
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#f87171' }}>+{delayInYears.toFixed(1)} Thn Kerja ⏳</div>
            </div>
          </Card>
        </div>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#9ca3af' }}>Prioritas Hutang</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#f87171' }}>{fmt(totalLiabVal)}</span>
          </div>
          {liabilities.length === 0 ? <div style={{ textAlign: 'center', color: '#4ade80', fontSize: '11px' }}>Bebas Hutang ✅</div> : (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {liabilities.map((l, i) => (
                <div key={l.id} style={{ flexShrink: 0, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid #1f1f2e' }}>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>{l.name}</div>
                  <div style={{ fontSize: '11px', fontWeight: '600' }}>{fmt(l.value)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280', fontSize: '12px' }}>Dashboard ini menggunakan algoritma finansial profesional. <a href="/dashboard/intelligence" style={{ color: '#60a5fa' }}>Pelajari selengkapnya.</a></p>
      </div>
    </div>
  );
}
