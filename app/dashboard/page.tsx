export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { Card, KpiCard, ProgressCard, EmptyState, SectionHeader, DividerLine } from './components/DashboardComponents';
import { KpiGridClient } from './components/KpiGridClient';
import { UserSelector } from './components/UserSelector';
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

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const { u: searchU } = await searchParams;
  const supabase = await createClient();

  const [userRes, prefetchedProfileRes] = await Promise.all([
    getCachedUser(),
    getCachedProfile(),
  ]);

  const user = userRes.data.user;
  if (!user) redirect('/login');

  let myProfile = prefetchedProfileRes.data;

  const [targetProfileRes, allUsersRes] = await Promise.all([
    (searchU && searchU !== 'all' && searchU !== myProfile?.id) 
      ? getCachedProfile(searchU as string) 
      : Promise.resolve({ data: null }),
    (myProfile?.role === 'owner')
      ? supabase.from('users').select('id, display_name').or('email.is.null,email.neq.demo@fintrack.app').order('display_name')
      : Promise.resolve({ data: [] })
  ]);

  if (!myProfile && user.email) {
    const { data: newProfile } = await supabase
      .from('users')
      .insert([{ id: user.id, email: user.email, display_name: user.email.split('@')[0], role: 'user' }])
      .select('id, display_name, telegram_chat_id, role')
      .single();
    if (newProfile) myProfile = newProfile as any;
  }
  if (!myProfile) return redirect('/login');

  const myUserId = myProfile.id;
  const isOwner = myProfile.role === 'owner';
  const isCollective = isOwner && searchU === 'all';
  const viewUserId = isOwner && searchU && searchU !== 'all' ? (searchU as string) : myUserId;

  let viewProfile = (isCollective) 
    ? { ...myProfile, display_name: 'Kolektif (Semua)' } as any 
    : (targetProfileRes.data || myProfile);

  const vAny = viewProfile as any;
  const safeProfile = {
    ...vAny,
    saving_target: vAny.saving_target ?? 20,
    wants_target: vAny.wants_target ?? 30,
    needs_target: vAny.needs_target ?? 50
  };

  const allUsers = allUsersRes.data ?? [];
  const userIds = allUsers.map(u => u.id);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
  const olderMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
  const olderMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0).toISOString().split('T')[0];
  const last30Start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const [yearResult, goals, assets, budgets, history] = await Promise.all([
    (() => {
      let q = supabase.from('transactions').select('amount, type, date, user_id, categories(id, name)').eq('is_deleted', false).gte('date', yearStart);
      if (isCollective) { if (userIds.length > 0) q = q.in('user_id', userIds); }
      else { q = q.eq('user_id', viewUserId); }
      return q;
    })(),
    (() => {
      let q = supabase.from('goals').select('*').eq('status', 'active').order('priority', { ascending: true }).limit(3);
      if (isCollective) { if (userIds.length > 0) q = q.in('user_id', userIds); }
      else { q = q.eq('user_id', viewUserId); }
      return q;
    })(),
    (() => {
      let q = supabase.from('assets').select('id, name, value, is_liability, type');
      if (isCollective) { if (userIds.length > 0) q = q.in('user_id', userIds); }
      else { q = q.eq('user_id', viewUserId); }
      return q;
    })(),
    (() => {
      let q = supabase.from('monthly_budgets').select('id, limit_amount, categories(id, name, icon)').eq('month', monthStart.slice(0, 7));
      if (isCollective) { if (userIds.length > 0) q = q.in('user_id', userIds); }
      else { q = q.eq('user_id', viewUserId); }
      return q;
    })(),
    (() => {
      let q = supabase.from('net_worth_history').select('date, net_worth').order('date', { ascending: true }).limit(30);
      if (isCollective) { if (userIds.length > 0) q = q.in('user_id', userIds); }
      else { q = q.eq('user_id', viewUserId); }
      return q;
    })()
  ]);

  const yearTxs = (yearResult.data ?? []) as any[];
  const txs      = yearTxs.filter(t => t.date >= monthStart) as unknown as Transaction[];
  const prevTxs  = yearTxs.filter(t => t.date >= prevMonthStart && t.date <= prevMonthEnd) as unknown as Transaction[];
  const olderTxs = yearTxs.filter(t => t.date >= olderMonthStart && t.date <= olderMonthEnd) as unknown as Transaction[];
  const last30   = yearTxs.filter(t => t.date >= last30Start) as unknown as Transaction[];
  const goalList = (goals.data ?? []) as Goal[];
  const assetList = (assets.data ?? []) as Asset[];
  const monthlyBudgets = (budgets.data ?? []) as any[];
  const nwHistory = (history.data ?? []) as { date: string; net_worth: number }[];


  const income   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense  = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance  = income - expense;
  const savingRate = income > 0 ? pct(balance, income) : 0;

  const prevExp  = prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const prevInc  = prevTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const prevSavRate = prevInc > 0 ? pct(prevInc - prevExp, prevInc) : 0;
  const olderExp = olderTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const monthlyExpBase = calculateMonthlyExpBase(expense, prevExp, olderExp);
  const burnRate = monthlyExpBase;
  const expTrend = prevExp > 0 ? ((expense - prevExp) / prevExp) * 100 : 0;
  const savRateTrend = savingRate - prevSavRate;

  const totalAsset = assetList.filter(a => !a.is_liability).reduce((s, a) => s + a.value, 0);
  const totalLiab  = assetList.filter(a => a.is_liability).reduce((s, a) => s + a.value, 0);
  const netWorth   = totalAsset - totalLiab;
  const investments = assetList.filter(a => !a.is_liability && a.type === 'investment').reduce((s, a) => s + a.value, 0);
  const liquidAssets = assetList.filter(a => !a.is_liability && a.type === 'cash').reduce((s, a) => s + a.value, 0);
  const monthlyInvRatio = income > 0 ? (txs.filter(t => t.type === 'expense' && t.categories?.name?.toLowerCase().includes('invest')).reduce((s, t) => s + t.amount, 0) / income) * 100 : 0;
  const investmentRatio = income > 0 ? (investments / (income * 12)) * 100 : 0;

  const efTargetMin = monthlyExpBase * 6;
  const efProgress = efTargetMin > 0 ? Math.min(pct(liquidAssets, efTargetMin), 100) : 0;
  const monthsCovered = monthlyExpBase > 0 ? (liquidAssets / monthlyExpBase) : 0;

  const debtKeywords = ['cicilan', 'kredit', 'kpr', 'hutang', 'pinjaman', 'paylater', 'kredit kendaraan'];
  const debtRatio = income > 0 ? (txs.filter(t => t.type === 'expense' && debtKeywords.some(k => (t.categories?.name ?? '').toLowerCase().includes(k))).reduce((s, t) => s + t.amount, 0) / income) * 100 : 0;

  const { score: healthScore, label: healthLabel, color: healthColor } = calculateHealthScore({
    savingRate, monthsCovered,
    debtRatio,
    monthlyInvRatio,
    isSurplus: balance > 0,
    targets: { saving: safeProfile.saving_target || 20, wants: safeProfile.wants_target || 30, needs: safeProfile.needs_target || 50 }
  });

  const lazyCash = (liquidAssets > (monthlyExpBase * 12)) ? { isLazy: true, amount: liquidAssets - (monthlyExpBase * 12) } : { isLazy: false, amount: 0 };
  const needsKeywords = ['makan', 'transport', 'sewa', 'utilitas', 'listrik', 'air', 'internet', 'cicilan', 'sekolah', 'asuransi', 'kesehatan'];
  const needsSum = txs.filter(t => t.type === 'expense' && needsKeywords.some(k => (t.categories?.name ?? '').toLowerCase().includes(k))).reduce((s, t) => s + t.amount, 0);
  const wantsSum = expense - needsSum;
  const savingsSum = balance > 0 ? balance : 0;
  const spendingRatio = income > 0 ? {
    needs: Math.round((needsSum / income) * 100),
    wants: Math.round((wantsSum / income) * 100),
    savings: Math.round((savingsSum / income) * 100)
  } : { needs: 0, wants: 0, savings: 0 };

  const archetype = detectArchetype({ savingRate, investmentRatio, monthsCovered, debtRatio });
  const survivalTime = burnRate > 0 ? (liquidAssets / burnRate) : 0;
  const survivalLabel = survivalTime >= 12 ? 'Sangat Aman' : survivalTime >= 6 ? 'Aman' : survivalTime >= 3 ? 'Waspada' : 'Kritis';
  const survivalColor = survivalTime >= 12 ? 'var(--color-positive)' : survivalTime >= 6 ? '#60a5fa' : survivalTime >= 3 ? 'var(--color-neutral)' : 'var(--color-negative)';

  const healthRecs: string[] = [];
  if (lazyCash.isLazy) healthRecs.push(`Uang mengendap berlebihan (${fmt(lazyCash.amount)}). Pertimbangkan untuk diinvestasikan.`);
  if (spendingRatio.wants > 30) healthRecs.push(`Pengeluaran keinginan (${spendingRatio.wants}%) melebihi batas ideal 30%.`);
  if (savingRate < 20) healthRecs.push('Tingkatkan saving rate ke 20% dengan memangkas pengeluaran tersier.');
  if (monthsCovered < 6) healthRecs.push('Prioritaskan dana darurat hingga minimal 6x pengeluaran bulanan.');
  if (balance < 0) healthRecs.push('Cashflow negatif. Segera evaluasi pengeluaran bulan ini.');
  if (healthRecs.length === 0) healthRecs.push('Kondisi keuangan dalam tren positif. Pertahankan pola ini.');

  const annualExpense = monthlyExpBase * 12;
  const fiNumber = annualExpense * 25;
  const fiProgress = fiNumber > 0 ? Math.min(pct(netWorth, fiNumber), 100) : 0;
  const monthlySurplus = balance > 0 ? balance : 0;
  const yearsToFI = calculateYearsToFI(netWorth, fiNumber, monthlySurplus);

  const expChange = prevExp > 0 ? ((expense - prevExp) / prevExp) * 100 : 0;
  const lifestyleStatus = (expChange > (prevInc > 0 ? ((income - prevInc) / prevInc) * 100 : 0) + 5 && expChange > 10) ? 'Terdeteksi' : 'Terkendali';
  const lifestylePositive = lifestyleStatus === 'Terkendali';

  const cashPct = totalAsset > 0 ? Math.round((liquidAssets / totalAsset) * 100) : 0;
  const invPct  = totalAsset > 0 ? Math.round((investments / totalAsset) * 100) : 0;
  const otherPct = 100 - cashPct - invPct;
  const liabilities = assetList.filter(a => a.is_liability);
  const totalLiabVal = totalLiab;

  const budgetAlerts = monthlyBudgets.map(b => {
    const spent = txs.filter(t => t.type === 'expense' && (t as any).category_id === b.categories?.id).reduce((s, t) => s + (t as any).amount, 0);
    const p = b.limit_amount > 0 ? (spent / b.limit_amount) * 100 : 0;
    return { name: b.categories?.name, spent, limit: b.limit_amount, pct: p };
  });
  const overBudgetCats = budgetAlerts.filter(a => a.pct >= 100);
  const nearLimitCats = budgetAlerts.filter(a => a.pct >= 80 && a.pct < 100);

  const dailyBudget = monthlyExpBase > 0 ? (monthlyExpBase / 30) : 0;
  const anomaly = detectAnomalies(txs, dailyBudget * 1.5);
  const forecast = forecastEndOfMonth(income, expense);

  const avgExpenseWorkHours = calculateWorkHourCost(expense, income);
  const subs = detectSubscriptions(txs);
  const totalSubs = subs.reduce((s, b) => s + b.amount, 0);

  const dailyCoffee = 40000;
  const invested20Y = dailyCoffee * 30 * 520.9;
  const bigPurchaseSample = 100000000;
  const delayInYears = monthlySurplus > 0 ? (bigPurchaseSample / monthlySurplus) / 12 : 0;
  const nextMilestone = netWorth <= 0 ? 100000000 : Math.pow(10, Math.ceil(Math.log10(netWorth + 1)));
  const milestoneProgress = Math.min(pct(netWorth, nextMilestone), 100);

  const userSpendMap: Record<string, number> = {};
  if (isCollective) {
    txs.filter(t => t.type === 'expense').forEach(t => {
      const uId = (t as any).user_id || 'Unknown';
      const uName = allUsers.find(u => u.id === uId)?.display_name || 'Lainnya';
      userSpendMap[uName] = (userSpendMap[uName] || 0) + t.amount;
    });
  }
  const collectiveBreakdown = Object.entries(userSpendMap).sort((a, b) => b[1] - a[1]);

  const chartMap: Record<string, { income: number; expense: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    chartMap[d] = { income: 0, expense: 0 };
  }
  last30.forEach(t => {
    if (!t.date || !t.type) return;
    const d = t.date.includes('T') ? t.date.split('T')[0] : t.date;
    if (chartMap[d]) chartMap[d][t.type] += t.amount;
  });
  const chartData = Object.entries(chartMap).map(([date, v]) => ({ date, ...v }));
  const maxVal = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 1);

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
  const welcomeText = isCollective ? 'Statistik Kolektif' : `Halo, ${firstName}`;

  const incomeYear = yearTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenseYear = yearTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savingRateYear = incomeYear > 0 ? pct(incomeYear - expenseYear, incomeYear) : 0;

  const monthlyKpis = [
    { label: "Kekayaan Bersih", value: fmt(Math.abs(netWorth)), subValue: `Aset: ${fmt(totalAsset)}`, valueColor: netWorth >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' },
    { label: "Pemasukan", value: fmt(income), subValue: `Bulan ${monthLabel}`, valueColor: 'var(--color-positive)' },
    { label: "Pengeluaran", value: fmt(expense), subValue: prevExp > 0 ? `${expTrend > 0 ? '↑' : '↓'} ${Math.abs(expTrend).toFixed(0)}%` : `Bulan ${monthLabel}`, valueColor: 'var(--color-negative)', subColor: Math.abs(expTrend) > 5 ? (expTrend > 0 ? 'var(--color-negative)' : 'var(--color-positive)') : 'var(--text-muted)' },
    { label: "Saving Rate", value: `${savingRate.toFixed(1)}%`, subValue: prevInc > 0 ? `${savRateTrend > 0 ? '↑' : '↓'} ${Math.abs(savRateTrend).toFixed(1)}%` : 'Target > 20%', valueColor: savingRate > 20 ? 'var(--color-positive)' : savingRate > 10 ? 'var(--color-neutral)' : 'var(--color-negative)', subColor: Math.abs(savRateTrend) > 2 ? (savRateTrend > 0 ? 'var(--color-positive)' : 'var(--color-negative)') : 'var(--text-muted)' },
    { label: "Survival Time", value: `${survivalTime.toFixed(1)} bln`, subValue: survivalLabel, valueColor: survivalColor, subColor: survivalColor },
    { label: "Burn Rate", value: fmt(burnRate), subValue: "Rata-rata 3 bln", valueColor: 'var(--color-negative)' }
  ];

  const yearlyKpis = [
    { label: "Kekayaan Bersih", value: fmt(Math.abs(netWorth)), subValue: `Liabilitas: ${fmt(totalLiab)}`, valueColor: netWorth >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' },
    { label: "Total Pemasukan", value: fmt(incomeYear), subValue: `Tahun ${now.getFullYear()}`, valueColor: 'var(--color-positive)' },
    { label: "Total Pengeluaran", value: fmt(expenseYear), subValue: `Tahun ${now.getFullYear()}`, valueColor: 'var(--color-negative)' },
    { label: "Avg Saving Rate", value: `${savingRateYear.toFixed(1)}%`, subValue: "YTD", valueColor: savingRateYear > 20 ? 'var(--color-positive)' : 'var(--color-negative)' },
    { label: "Survival Time", value: `${survivalTime.toFixed(1)} bln`, subValue: survivalLabel, valueColor: survivalColor, subColor: survivalColor },
    { label: "Avg Burn Rate", value: fmt(incomeYear > 0 ? expenseYear / (now.getMonth() + 1) : 0), subValue: "Rerata per bulan", valueColor: 'var(--color-negative)' }
  ];

  // ─── Styles ────────────────────────────────────────────────────────────────
  const sectionDividerStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-subtle)',
    letterSpacing: '0.04em',
    margin: '32px 0 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  return (
    <div style={{ color: 'var(--text-main)', fontFamily: '"DM Sans", system-ui, sans-serif' }}>

      <style>{`
        .ov-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; gap: 16px; }
        .ov-grid6 { display: grid; grid-template-columns: repeat(6,1fr); gap: 12px; margin-bottom: 12px; }
        .ov-grid2 { display: grid; grid-template-columns: 1.6fr 1fr; gap: 12px; margin-bottom: 12px; }
        .ov-grid3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 12px; }
        .ov-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 18px;
          transition: border-color 0.2s ease;
        }
        .ov-card:hover { border-color: var(--border-color-md); }
        .section-divider {
          font-size: 12px; font-weight: 500; color: var(--text-subtle);
          letter-spacing: 0.04em; margin: 32px 0 16px;
          display: flex; align-items: center; gap: 10px;
        }
        .section-divider::after { content: ""; flex: 1; height: 1px; background: var(--border-color); }
        @media (max-width: 1400px) {
          .ov-grid6 { grid-template-columns: repeat(3,1fr); }
          .ov-grid3 { grid-template-columns: repeat(2,1fr); }
        }
        @media (max-width: 900px) {
          .ov-grid6 { grid-template-columns: repeat(2,1fr); }
          .ov-grid3 { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .ov-header { flex-direction: column; gap: 16px; }
          .ov-header > div:last-child { width: 100%; }
          .ov-grid6 { grid-template-columns: 1fr; gap: 8px; }
          .ov-grid2 { grid-template-columns: 1fr; gap: 8px; }
          .ov-grid3 { grid-template-columns: 1fr; gap: 8px; }
          .ov-grid-inner { grid-template-columns: 1fr !important; }
          .ov-card { padding: 14px; }
          .section-divider { margin: 24px 0 12px; }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="ov-header">
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: '22px',
            fontWeight: '600',
            margin: '0 0 4px',
            letterSpacing: '-0.3px',
            color: 'var(--text-main)',
          }}>
            {welcomeText}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            {dateLabel}
            {isCollective && ' · Keluarga (Kolektif)'}
            {!isCollective && isOwner && viewUserId !== myProfile.id && ` · ${allUsers.find(u => u.id === viewUserId)?.display_name || 'Member'}`}
          </p>
        </div>

        {/* Health Score Badge */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: 'var(--card-shadow)',
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '12px',
              color: 'var(--text-main)',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              marginBottom: '3px',
            }}>
              {archetype}
            </div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: healthColor }}>
              {healthLabel}
            </div>
          </div>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: `2px solid ${healthColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            fontWeight: '600',
            color: 'var(--text-main)',
            background: 'var(--bg-primary)',
          }}>
            {healthScore}
          </div>
        </div>
      </div>

      {/* ── Anomaly Alert ──────────────────────────────────────────────────── */}
      {anomaly.isAnomaly && (
        <Card style={{
          marginBottom: '12px',
          background: 'var(--color-negative-bg)',
          border: '1px solid var(--color-negative)',
          borderColor: 'rgba(var(--color-negative-rgb, 220,38,38), 0.25)',
        }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ fontSize: '18px', flexShrink: 0 }}>⚠</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-negative)', marginBottom: '3px' }}>
                Pengeluaran hari ini melampaui batas
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Total {fmt(anomaly.amount)} · Batas harian {fmt(anomaly.limit)} · Selisih {fmt(anomaly.diff)}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Budget Alerts (Agent Warning) ─────────────────────────────────── */}
      {overBudgetCats.length > 0 && (
        <Card style={{
          marginBottom: '12px',
          background: 'var(--color-negative-bg)',
          border: '1px solid var(--color-negative)',
          borderColor: 'rgba(220,38,38, 0.25)',
        }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ fontSize: '18px', flexShrink: 0 }}>🚨</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-negative)', marginBottom: '3px' }}>
                Budget Terlampaui!
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {overBudgetCats.length} kategori melebihi limit: <strong>{overBudgetCats.map(c => c.name).join(', ')}</strong>
              </div>
            </div>
          </div>
        </Card>
      )}

      {nearLimitCats.length > 0 && (
        <Card style={{
          marginBottom: '12px',
          background: 'var(--color-neutral-bg)',
          border: '1px solid var(--color-neutral)',
          borderColor: 'rgba(217,119,6, 0.25)',
        }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-neutral)', marginBottom: '3px' }}>
                Budget Hampir Habis (Peringatan Agen)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {nearLimitCats.length} kategori di atas 80%: <strong>{nearLimitCats.map(c => c.name).join(', ')}</strong>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Recommendations ────────────────────────────────────────────────── */}
      <Card style={{
        marginBottom: '24px',
        background: 'var(--color-neutral-bg)',
        border: '1px solid rgba(217,119,6,0.2)',
      }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>💡</div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '500',
              color: 'var(--color-neutral)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Rekomendasi
            </div>
            <ul style={{
              margin: 0,
              paddingLeft: '16px',
              fontSize: '13px',
              color: 'var(--text-muted)',
              lineHeight: '1.7',
            }}>
              {healthRecs.map((rec, i) => (
                <li key={i} style={{ marginBottom: '2px' }}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* ── Section: Keamanan ─────────────────────────────────────────────── */}
      <div className="section-divider">Keamanan</div>

      <div className="ov-grid3">
        {/* Cashflow Forecast */}
        <Card>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '14px',
            gap: '12px',
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>
              Cashflow forecast
            </span>
            <span style={{
              fontSize: '15px',
              fontWeight: '600',
              color: forecast.isNegative ? 'var(--color-negative)' : 'var(--color-positive)',
              textAlign: 'right',
              flexShrink: 0,
            }}>
              {forecast.isNegative ? 'Defisit' : 'Surplus'} {fmt(Math.abs(forecast.predictedBalance))}
            </span>
          </div>
          <div style={{ height: '3px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              borderRadius: '99px',
              width: `${Math.min(pct(forecast.predictedTotalExp, income), 100)}%`,
              background: forecast.isNegative ? 'var(--color-negative)' : 'var(--color-positive)',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
              Est. pengeluaran: {fmt(forecast.predictedTotalExp)}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
              {forecast.confidence}
            </span>
          </div>
        </Card>

        <ProgressCard
          label="Debt-to-income (maks 30%)"
          current={debtRatio}
          target={30}
          progress={Math.min((debtRatio / 30) * 100, 100)}
          color={debtRatio > 35 ? 'var(--color-negative)' : debtRatio > 30 ? 'var(--color-neutral)' : 'var(--color-positive)'}
          footerLeft={`Rasio saat ini: ${debtRatio.toFixed(1)}%`}
          footerRight={
            <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
              {debtRatio > 30 ? 'Perlu perhatian' : 'Terkendali'}
            </span>
          }
        />

        <ProgressCard
          label="Dana darurat (min 6×)"
          current={liquidAssets}
          target={efTargetMin}
          progress={efProgress}
          color={efProgress >= 100 ? 'var(--color-positive)' : efProgress >= 50 ? 'var(--color-neutral)' : 'var(--color-negative)'}
          footerLeft="Target: 6× pengeluaran"
          footerRight={
            <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
              {efProgress >= 100 ? 'Tercapai' : `Kurang ${fmt(efTargetMin - liquidAssets)}`}
            </span>
          }
        />
      </div>

      {/* Collective Distribution */}
      {isCollective && collectiveBreakdown.length > 1 && (
        <Card style={{ marginBottom: '12px' }}>
          <SectionHeader title="Distribusi pengeluaran keluarga" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            {collectiveBreakdown.map(([name, amount], idx) => (
              <div key={idx} style={{
                padding: '12px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-subtle)', marginBottom: '6px' }}>
                  {name}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
                  {fmt(amount)}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-negative)', marginTop: '3px' }}>
                  {pct(amount, expense)}% dari total
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Section: Kondisi Saat Ini ──────────────────────────────────────── */}
      <div className="section-divider">Kondisi saat ini</div>

      <KpiGridClient monthly={monthlyKpis} yearly={yearlyKpis} />

      {/* Chart 30 Hari */}
      <Card style={{ marginBottom: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>
              Arus kas 30 hari terakhir
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Pemasukan vs pengeluaran harian
            </div>
          </div>
          <div style={{ display: 'flex', gap: '14px' }}>
            {[
              { label: 'Masuk', color: 'var(--color-positive)' },
              { label: 'Keluar', color: 'var(--color-negative)' },
            ].map(({ label, color }) => (
              <div key={label} style={{
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: 'var(--text-muted)',
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div style={{
          height: '180px',
          width: '100%',
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '2px',
          paddingBottom: '20px',
        }}>
          {chartData.map((d, i) => {
            const hInc = (d.income / maxVal) * 100;
            const hExp = (d.expense / maxVal) * 100;
            return (
              <div key={i} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', gap: '1px' }}>
                <div style={{
                  flex: 1,
                  height: `${Math.max(hInc, 1)}%`,
                  background: hInc > 0 ? 'var(--color-positive)' : 'var(--border-color)',
                  borderRadius: '1px',
                  opacity: hInc > 0 ? 0.8 : 0.3,
                }} title={`${d.date}: ${fmt(d.income)}`} />
                <div style={{
                  flex: 1,
                  height: `${Math.max(hExp, 1)}%`,
                  background: hExp > 0 ? 'var(--color-negative)' : 'var(--border-color)',
                  borderRadius: '1px',
                  opacity: hExp > 0 ? 0.8 : 0.3,
                }} title={`${d.date}: ${fmt(d.expense)}`} />
              </div>
            );
          })}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            display: 'flex', justifyContent: 'space-between', padding: '0 2px',
          }}>
            <span style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>{chartData[0]?.date}</span>
            <span style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>Hari ini</span>
          </div>
        </div>

        {txs.length === 0 && (
          <div style={{ marginTop: '16px' }}>
            <EmptyState message="Belum ada data transaksi bulan ini." />
          </div>
        )}
      </Card>

      <div className="ov-grid2">
        {/* Realisasi Saldo */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>
              Realisasi saldo {monthLabel}
            </span>
            <span style={{
              fontSize: '15px',
              fontWeight: '600',
              color: balance >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
            }}>
              {balance >= 0 ? '+' : '−'}{fmt(Math.abs(balance))}
            </span>
          </div>
          {income > 0 && (
            <div style={{ height: '3px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                borderRadius: '99px',
                width: `${Math.min(pct(expense, income), 100)}%`,
                background: pct(expense, income) > 90
                  ? 'var(--color-negative)'
                  : pct(expense, income) > 70
                  ? 'var(--color-neutral)'
                  : 'var(--color-positive)',
                transition: 'width 0.5s ease',
              }} />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
              {income > 0 ? `${pct(expense, income)}% terpakai` : 'Belum ada pemasukan'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
              {txs.length} transaksi
            </span>
          </div>
        </Card>

        {/* Transaksi Terakhir */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>
              Transaksi terakhir
            </span>
            <a
              href={`/dashboard/transactions${searchU ? `?u=${searchU}` : ''}`}
              style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}
            >
              Semua →
            </a>
          </div>
          {txs.length === 0 ? (
            <EmptyState message="Belum ada riwayat transaksi." />
          ) : (
            <div>
              {txs.slice(0, 5).map((t, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '9px 0',
                  borderBottom: i < 4 ? '1px solid var(--border-color)' : 'none',
                }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>
                      {t.categories?.name ?? 'Lain-lain'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '1px' }}>
                      {new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: t.type === 'income' ? 'var(--color-positive)' : 'var(--color-negative)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {t.type === 'income' ? '+' : '−'}{fmt(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="ov-grid3" style={{ marginTop: '12px' }}>
        <Card>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Inflasi gaya hidup</div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: lifestylePositive ? 'var(--color-positive)' : 'var(--color-negative)' }}>
            {lifestyleStatus}
          </div>
        </Card>
        <Card style={{ borderColor: suspectedSubs.length > 0 ? 'rgba(217,119,6,0.3)' : 'var(--border-color)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Langganan aktif</div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: suspectedSubs.length > 0 ? 'var(--color-neutral)' : 'var(--color-positive)' }}>
            {suspectedSubs.length} layanan
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Biaya kerja rata-rata</div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main)' }}>
            {avgExpenseWorkHours.toFixed(1)} jam/bln
          </div>
        </Card>
      </div>

      {/* ── Section: Masa Depan ────────────────────────────────────────────── */}
      <div className="section-divider">Masa depan</div>

      <div className="ov-grid2">
        <ProgressCard
          label="Financial independence"
          current={netWorth}
          target={fiNumber}
          progress={fiProgress}
          color="var(--accent-primary)"
          footerLeft={`Target: ${fmt(fiNumber)}`}
          footerRight={
            <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
              Est. {yearsToFI} thn lagi
            </span>
          }
        />

        {/* Pertumbuhan Kekayaan */}
        <Card style={{ position: 'relative', overflow: 'hidden' }}>
          {nwHistory.length > 2 && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '48px', opacity: 0.12, pointerEvents: 'none' }}>
              <svg width="100%" height="100%" preserveAspectRatio="none" viewBox={`0 0 ${nwHistory.length - 1} 100`}>
                <polyline
                  fill="none"
                  stroke={balance >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'}
                  strokeWidth="6"
                  points={nwHistory.map((h, i) => {
                    const min = Math.min(...nwHistory.map(x => x.net_worth));
                    const max = Math.max(...nwHistory.map(x => x.net_worth));
                    return `${i},${100 - ((h.net_worth - min) / (max - min || 1)) * 100}`;
                  }).join(' ')}
                />
              </svg>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>
              Pertumbuhan kekayaan
            </span>
            <span style={{ fontSize: '15px', fontWeight: '600', color: balance >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}>
              {balance >= 0 ? '↑' : '↓'} {fmt(Math.abs(balance))}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>
            {balance >= 0 ? 'Tren positif bulan ini' : 'Tren negatif bulan ini'}
          </div>
        </Card>
      </div>

      <div className="ov-grid3">
        {/* Goals */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>Goals utama</span>
            <a
              href={`/dashboard/goals${searchU ? `?u=${searchU}` : ''}`}
              style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}
            >
              Detail →
            </a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {goalList.slice(0, 2).map(g => {
              const p = pct(g.current_amount, g.target_amount);
              return (
                <div key={g.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>
                      {g.icon} {g.name}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p}%</span>
                  </div>
                  <div style={{ height: '3px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${p}%`,
                      background: p >= 100 ? 'var(--color-positive)' : 'var(--accent-primary)',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              );
            })}
            {goalList.length === 0 && <EmptyState message="Belum ada goals aktif." />}
          </div>
        </Card>

        {/* Milestone — dark monokrom */}
        <Card style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-color-md)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>Milestone</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{fmt(nextMilestone)}</span>
          </div>
          <div style={{ height: '3px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{
              height: '100%',
              width: `${milestoneProgress}%`,
              background: 'var(--accent-primary)',
              transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
            }} />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
            {milestoneProgress.toFixed(0)}% menuju target berikut
          </div>
        </Card>

        {/* Alokasi Aset */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>Alokasi aset</span>
            <span style={{ fontSize: '12px', color: 'var(--color-positive)' }}>{cashPct}% kas</span>
          </div>
          <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '6px', overflow: 'hidden', display: 'flex', marginBottom: '14px' }}>
            <div style={{ width: `${cashPct}%`, background: 'var(--color-positive)', transition: 'width 0.5s ease' }} />
            <div style={{ width: `${invPct}%`, background: 'var(--accent-primary)', opacity: 0.7 }} />
            <div style={{ width: `${otherPct}%`, background: 'var(--border-color-md)' }} />
          </div>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {[
              { label: 'Kas', color: 'var(--color-positive)' },
              { label: 'Investasi', color: 'var(--accent-primary)' },
              { label: 'Lainnya', color: 'var(--border-color-md)' },
            ].map(({ label, color }) => (
              <div key={label} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }}>
                <div style={{ width: '6px', height: '6px', background: color, borderRadius: '2px' }} />
                {label}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Section: Simulasi ─────────────────────────────────────────────── */}
      <div className="section-divider">Simulasi</div>

      <div className="ov-grid2">
        <div className="ov-grid-inner" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Biaya Peluang */}
          <Card>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Biaya peluang
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-subtle)', marginBottom: '8px' }}>
              {fmt(dailyCoffee)}/hari diinvestasikan selama 20 tahun
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-positive)' }}>
              ~{fmt(invested20Y)}
            </div>
          </Card>

          {/* Efek Belanja Besar */}
          <Card>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Efek belanja besar
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-subtle)', marginBottom: '8px' }}>
              Beli {fmt(bigPurchaseSample)} tunai
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-negative)' }}>
              +{delayInYears.toFixed(1)} thn kerja
            </div>
          </Card>
        </div>

        {/* Prioritas Hutang */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>
              Prioritas hutang
            </span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-negative)' }}>
              {fmt(totalLiabVal)}
            </span>
          </div>
          {liabilities.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-positive)', fontSize: '13px', padding: '10px 0' }}>
              Bebas hutang
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {liabilities.map(l => (
                <div key={l.id} style={{
                  flexShrink: 0,
                  padding: '10px 14px',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-subtle)', marginBottom: '4px' }}>
                    {l.name}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                    {fmt(l.value)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Footer */}
      <div style={{ padding: '48px 0 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-subtle)', fontSize: '12px' }}>
          Data diperbarui secara real-time dari Supabase
        </p>
      </div>
    </div>
  );
}
