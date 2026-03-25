// app/dashboard/page.tsx
export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, KpiCard, ProgressCard } from './components/DashboardComponents';
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 1. Ambil profil login asli (mendukung ID mismatch via email)
  let { data: myProfile, error: profileError } = await supabase
    .from('users')
    .select('id, display_name, telegram_chat_id, role, saving_target, wants_target, needs_target')
    .or(`id.eq.${user.id},email.ilike.${user.email}`)
    .maybeSingle();

  // 2. Auto-register if missing (Server side fallback)
  if (!myProfile && user.email) {
    const { data: newProfile } = await supabase
      .from('users')
      .insert([{
        id: user.id,
        email: user.email,
        display_name: user.email.split('@')[0],
        role: 'user'
      }])
      .select('id, display_name, telegram_chat_id, role, saving_target, wants_target, needs_target')
      .single();
    if (newProfile) myProfile = newProfile;
  }

  if (!myProfile) {
    return (
      <div style={{ 
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', 
        background: '#0a0a0f', color: '#f0f0f5', flexDirection: 'column', gap: '16px', padding: '24px', textAlign: 'center' 
      }}>
        <div style={{ fontSize: '48px' }}>👤</div>
        <h2>Profil Tidak Ditemukan</h2>
        <p style={{ color: '#6b7280', fontSize: '14px', maxWidth: '400px' }}>
          Gagal memuat profil untuk {user.email}. Hubungi admin untuk akses.
        </p>
        <a href="/login" style={{ padding: '8px 16px', background: '#1f1f2e', borderRadius: '8px', color: '#f0f0f5', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>Kembali Login</a>
      </div>
    );
  }

  const myUserId = myProfile.id;
  const isOwner = myProfile.role === 'owner';
  const isCollective = isOwner && searchU === 'all';
  
  // 2. Tentukan User mana yang datanya mau dilihat
  const viewUserId = isOwner && searchU && searchU !== 'all' ? searchU : myUserId;

  // 3. Ambil profil user yang sedang dilihat (untuk target & nama di dashboard)
  let viewProfile = myProfile;
  if (isCollective) {
    viewProfile = { ...myProfile, display_name: 'Kolektif (Semua)' };
  } else if (isOwner && searchU && searchU !== 'all' && searchU !== myUserId) {
    const { data: selectedProfile } = await supabase
      .from('users')
      .select('id, display_name, telegram_chat_id, role, saving_target, wants_target, needs_target')
      .eq('id', searchU)
      .maybeSingle();
    if (selectedProfile) viewProfile = selectedProfile;
  }

  // Fallback targets for TS
  const safeProfile = {
    ...viewProfile,
    saving_target: viewProfile.saving_target ?? 20,
    wants_target: viewProfile.wants_target ?? 30,
    needs_target: viewProfile.needs_target ?? 50
  };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
  const olderMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
  const olderMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0).toISOString().split('T')[0];

  const [txMonth, txPrev, txOlder, txLast30, txYear, goals, assets, history, usersResult] = await Promise.all([
    // Monthly transactions
    (() => {
      let q = supabase.from('transactions').select('amount, type, date, categories(name)').eq('is_deleted', false).gte('date', monthStart);
      if (!isCollective) q = q.eq('user_id', viewUserId);
      return q;
    })(),
    // Previous Month
    (() => {
      let q = supabase.from('transactions').select('amount, type, date, categories(name)').eq('is_deleted', false).gte('date', prevMonthStart).lte('date', prevMonthEnd);
      if (!isCollective) q = q.eq('user_id', viewUserId);
      return q;
    })(),
    // Older Month
    (() => {
      let q = supabase.from('transactions').select('amount, type, date, categories(name)').eq('is_deleted', false).gte('date', olderMonthStart).lte('date', olderMonthEnd);
      if (!isCollective) q = q.eq('user_id', viewUserId);
      return q;
    })(),
    // Last 30 days
    (() => {
      let q = supabase.from('transactions').select('amount, type, date, categories(name)').eq('is_deleted', false)
        .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
        .order('date', { ascending: true });
      if (!isCollective) q = q.eq('user_id', viewUserId);
      return q;
    })(),
    // Yearly transactions
    (() => {
      let q = supabase.from('transactions').select('amount, type, date, categories(name)').eq('is_deleted', false).gte('date', yearStart);
      if (!isCollective) q = q.eq('user_id', viewUserId);
      return q;
    })(),
    // Goals
    (() => {
      let q = supabase.from('goals').select('*').eq('status', 'active').order('priority', { ascending: true }).limit(3);
      if (!isCollective) q = q.eq('user_id', viewUserId);
      return q;
    })(),
    // Assets
    (() => {
      let q = supabase.from('assets').select('id, name, value, is_liability, type');
      if (!isCollective) q = q.eq('user_id', viewUserId);
      return q;
    })(),
    // History
    (() => {
      let q = supabase.from('net_worth_history').select('date, net_worth').order('date', { ascending: true }).limit(30);
      if (!isCollective) q = q.eq('user_id', viewUserId);
      return q;
    })(),
    // Users for Owner
    isOwner ? supabase.from('users').select('id, display_name').or('email.is.null,email.neq.demo@fintrack.app').order('display_name') : Promise.resolve({ data: [] })
  ]);

  const txs      = (txMonth.data ?? []) as unknown as Transaction[];
  const prevTxs  = (txPrev.data ?? []) as unknown as Transaction[];
  const olderTxs = (txOlder.data ?? []) as unknown as Transaction[];
  const last30   = (txLast30.data ?? []) as unknown as Transaction[];
  const yearTxs  = (txYear.data ?? []) as unknown as Transaction[];
  const goalList = (goals.data ?? []) as Goal[];
  const assetList = (assets.data ?? []) as Asset[];
  const nwHistory = (history.data ?? []) as { date: string; net_worth: number }[];
  const allUsers  = (usersResult?.data ?? []) as any[];

  // Basic Totals
  const income   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense  = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance  = income - expense;
  const savingRate = income > 0 ? pct(balance, income) : 0;

  const prevExp  = prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const prevInc  = prevTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const prevSavRate = prevInc > 0 ? pct(prevInc - prevExp, prevInc) : 0;
  
  const olderExp = olderTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

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
    debtRatio: income > 0 ? (txs.filter(t => t.type === 'expense' && (t.categories?.name ?? '').toLowerCase().includes('cicilan')).reduce((s, t) => s + t.amount, 0) / income) * 100 : 0,
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
  last30.forEach(t => { 
    if (!t.date || !t.type) return;
    const d = t.date.includes('T') ? t.date.split('T')[0] : t.date;
    if (chartMap[d]) chartMap[d][t.type] += t.amount; 
  });
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
  const welcomeText = isCollective ? 'Statistik Kolektif Keluarga' : `Halo, ${firstName}!`;

  // CSS Variables for Theme
  // Spending Efficiency Logic Replacement for Ratio Visualization
  const spendingEfficiency = expense > 0 ? (needsSum / expense) * 100 : 0;
  const efficiencyLabel = spendingEfficiency <= 50 ? 'Sangat Efisien' : spendingEfficiency <= 70 ? 'Wajar' : 'Banyak Keinginan';

  // KPI Grid Data (Monthly vs Yearly)
  const incomeYear = yearTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenseYear = yearTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savingRateYear = incomeYear > 0 ? pct(incomeYear - expenseYear, incomeYear) : 0;

  const monthlyKpis = [
    { label: "Kekayaan Bersih", value: fmt(Math.abs(netWorth)), subValue: `Aset: ${fmt(totalAsset)}`, valueColor: netWorth >= 0 ? '#10b981' : '#ef4444' },
    { label: "Pemasukan", value: fmt(income), subValue: `Bulan ${monthLabel}`, valueColor: "#10b981" },
    { label: "Pengeluaran", value: fmt(expense), subValue: prevExp > 0 ? `${expTrend > 0 ? '↑' : '↓'} ${Math.abs(expTrend).toFixed(0)}%` : `Bulan ${monthLabel}`, valueColor: "#ef4444", subColor: Math.abs(expTrend) > 5 ? (expTrend > 0 ? '#ef4444' : '#10b981') : 'var(--text-muted)' },
    { label: "Saving Rate", value: `${savingRate.toFixed(1)}%`, subValue: prevInc > 0 ? `${savRateTrend > 0 ? '↑' : '↓'} ${Math.abs(savRateTrend).toFixed(1)}%` : 'Target > 20%', valueColor: savingRate > 20 ? '#10b981' : savingRate > 10 ? '#f59e0b' : '#ef4444', subColor: Math.abs(savRateTrend) > 2 ? (savRateTrend > 0 ? '#10b981' : '#ef4444') : 'var(--text-muted)' },
    { label: "Survival Time", value: `${survivalTime.toFixed(1)} bln`, subValue: survivalLabel, valueColor: survivalColor, subColor: survivalColor },
    { label: "Burn Rate", value: fmt(burnRate), subValue: "Rata-rata 3 bln", valueColor: "#ef4444" }
  ];

  const yearlyKpis = [
    { label: "Kekayaan Bersih", value: fmt(Math.abs(netWorth)), subValue: `Liabilitas: ${fmt(totalLiab)}`, valueColor: netWorth >= 0 ? '#10b981' : '#ef4444' },
    { label: "Total Pemasukan", value: fmt(incomeYear), subValue: `Tahun ${now.getFullYear()}`, valueColor: "#10b981" },
    { label: "Total Pengeluaran", value: fmt(expenseYear), subValue: `Tahun ${now.getFullYear()}`, valueColor: "#ef4444" },
    { label: "Avg Saving Rate", value: `${savingRateYear.toFixed(1)}%`, subValue: "YTD (Year to Date)", valueColor: savingRateYear > 20 ? '#10b981' : '#ef4444' },
    { label: "Survival Time", value: `${survivalTime.toFixed(1)} bln`, subValue: survivalLabel, valueColor: survivalColor, subColor: survivalColor },
    { label: "Avg Burn Rate", value: fmt(incomeYear > 0 ? expenseYear / (now.getMonth() + 1) : 0), subValue: "Rerata per bulan", valueColor: "#ef4444" }
  ];

  return (
    <div className="dashboard-root" style={{ color: 'var(--text-main)', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      
      <style>{`
        .dashboard-root { padding: 0; }
        .ov-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; }
        .ov-section-title { font-size: 14px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin: 24px 0 12px; display: flex; align-items: center; gap: 8px; }
        .ov-section-title::after { content: ""; flex: 1; height: 1px; background: var(--border-color); }
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
          .ov-header { flex-direction: column; align-items: flex-start; gap: 20px; }
          .ov-header > div:last-child { width: 100%; justify-content: space-between; }
          .ov-section-title { font-size: 12px; margin: 32px 0 16px; }
          .ov-grid6 { grid-template-columns: 1fr; gap: 8px; }
          .ov-grid2 { grid-template-columns: 1fr; gap: 8px; }
          .ov-grid3 { grid-template-columns: 1fr; gap: 8px; }
          .ov-grid-inner { grid-template-columns: 1fr !important; }
        }
        .ov-card { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .ov-card:hover { transform: translateY(-2px); }
        @media (max-width: 768px) { .ov-card { padding: 14px; border-radius: 10px; } .ov-card:hover { transform: none; } }
      `}</style>

      {/* Header */}
      <div className="ov-header">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.5px', color: 'var(--text-main)' }}>
            {welcomeText} 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, fontWeight: '500' }}>{dateLabel}</p>
        </div>
        <div style={{ 
          background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', 
          padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '16px',
          boxShadow: 'var(--card-shadow)'
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '2px', fontWeight: '700' }}>{archetype}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '2px', fontWeight: '700' }}>Financial Health</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: healthColor }}>{healthLabel}</div>
          </div>
          <div style={{ 
            width: '48px', height: '48px', borderRadius: '50%', border: `4px solid ${healthColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '900',
            color: 'var(--text-main)', background: 'var(--bg-primary)'
          }}>
            {healthScore}
          </div>
        </div>
      </div>

      {/* Step A: Anomaly Alert */}
      {anomaly.isAnomaly && (
        <Card style={{ marginBottom: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ fontSize: '28px' }}>🚨</div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#ef4444' }}>Peringatan: Pengeluaran Hari Ini Melonjak!</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>
                Total: <strong style={{color: 'var(--text-main)'}}>{fmt(anomaly.amount)}</strong> (Melebihi budget harian <strong style={{color: 'var(--text-main)'}}>{fmt(anomaly.limit)}</strong> sebesar <strong style={{color: '#ef4444'}}>{fmt(anomaly.diff)}</strong>).
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Recommendations */}
      <Card style={{ marginBottom: '16px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '24px' }}>💡</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#d97706' }}>Rekomendasi Konsultan Finansial</div>
              <a href="/dashboard/intelligence" style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>Lihat Detail →</a>
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', fontWeight: '500' }}>
              {healthRecs.map((rec, i) => <li key={i} style={{ marginBottom: '4px' }}>{rec}</li>)}
            </ul>
          </div>
        </div>
      </Card>

      {/* SECTION 1: THE PROTECTOR (Safety First) */}
      <div className="ov-section-title">The Protector (Keamanan) 🛡️</div>
      <div className="ov-grid3">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700', flex: 1 }}>CASHFLOW FORECAST</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: forecast.isNegative ? '#ef4444' : '#10b981', textAlign: 'right' }}>
              {forecast.isNegative ? 'Defisit' : 'Surplus'} {fmt(Math.abs(forecast.predictedBalance))}
            </span>
          </div>
          <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', borderRadius: '99px', 
              width: `${Math.min(pct(forecast.predictedTotalExp, income), 100)}%`, 
              background: forecast.isNegative ? '#ef4444' : '#3b82f6',
              transition: 'width 0.5s ease'
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>Est. Total Pengeluaran: {fmt(forecast.predictedTotalExp)}</span>
            <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', fontWeight: '600' }}>Akurasi {forecast.confidence}</span>
          </div>
        </Card>
        <ProgressCard 
          label="DEBT-TO-INCOME (MAX 30%)" 
          current={debtRatio} 
          target={30} 
          progress={Math.min((debtRatio / 30) * 100, 100)} 
          color={debtRatio > 35 ? '#ef4444' : debtRatio > 30 ? '#f59e0b' : '#10b981'} 
          footerLeft={`Rasio Saat Ini: ${debtRatio.toFixed(1)}%`} 
          footerRight={<span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{debtRatio > 30 ? 'Bahaya!' : 'Terkendali'}</span>} 
        />
        <ProgressCard 
          label="DANA DARURAT (MIN 6X)" 
          current={liquidAssets} 
          target={efTargetMin} 
          progress={efProgress} 
          color={efProgress >= 100 ? '#10b981' : efProgress >= 50 ? '#f59e0b' : '#ef4444'} 
          footerLeft={`Safety Net: 6x Exp`} 
          footerRight={<span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{efProgress >= 100 ? 'Aman ✅' : `${fmt(efTargetMin - liquidAssets)} lagi`}</span>} 
        />
      </div>

      {/* SECTION 2: THE REALITY (Current Status) */}
      <div className="ov-section-title">The Reality (Kondisi Saat Ini) 📊</div>
      
      {/* KPI Grid */}
      <KpiGridClient monthly={monthlyKpis} yearly={yearlyKpis} />

      {/* Main Income vs Expense Chart (30 Days) */}
      <Card style={{ marginBottom: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>ARUS KAS 30 HARI TERAKHIR</span>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Pemasukan vs Pengeluaran Harian</div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontWeight: '600' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981' }} /> In
            </div>
            <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontWeight: '600' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#ef4444' }} /> Out
            </div>
          </div>
        </div>

        {/* Chart SVG */}
        <div style={{ height: '200px', width: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '2px', paddingBottom: '20px' }}>
          {chartData.map((d, i) => {
            const hInc = (d.income / maxVal) * 100;
            const hExp = (d.expense / maxVal) * 100;
            return (
              <div key={i} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', gap: '1px' }}>
                <div style={{ 
                  flex: 1, height: `${Math.max(hInc, 1.5)}%`, background: hInc > 0 ? '#10b981' : 'rgba(16, 185, 129, 0.1)', 
                  borderRadius: '1px', opacity: hInc > 0 ? 1 : 0.3 
                }} title={`${d.date}: ${fmt(d.income)}`} />
                <div style={{ 
                  flex: 1, height: `${Math.max(hExp, 1.5)}%`, background: hExp > 0 ? '#ef4444' : 'rgba(239, 68, 68, 0.1)', 
                  borderRadius: '1px', opacity: hExp > 0 ? 1 : 0.3 
                }} title={`${d.date}: ${fmt(d.expense)}`} />
              </div>
            );
          })}
          
          {/* Chart Axis Labels */}
          <div style={{ position: 'absolute', bottom: '0', left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{chartData[0]?.date}</span>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Hari ini</span>
          </div>
        </div>

        {txs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', background: 'var(--bg-primary)', borderRadius: '8px', marginTop: '10px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Belum ada data transaksi bulan ini.</div>
          </div>
        )}
      </Card>

      <div className="ov-grid2">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700' }}>REALISASI SALDO {monthLabel.toUpperCase()}</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: balance >= 0 ? '#10b981' : '#ef4444' }}>{balance >= 0 ? '+' : '-'}{fmt(Math.abs(balance))}</span>
          </div>
          {income > 0 && (
            <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '99px', width: `${Math.min(pct(expense, income), 100)}%`, background: pct(expense, income) > 90 ? '#ef4444' : pct(expense, income) > 70 ? '#f59e0b' : '#3b82f6', transition: 'width 0.5s ease' }}/>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{income > 0 ? `${pct(expense, income)}% terpakai` : 'Belum ada pemasukan'}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>{txs.length} transaksi tercatat</span>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>TRANSAKSI TERAKHIR</span>
            <a href="/dashboard/transactions" style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>Semua →</a>
          </div>
          {txs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
              Belum ada transaksi di periode ini.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {txs.slice(0, 5).map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < 4 ? '1px solid var(--border-color)' : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{t.categories?.name ?? 'Lain-lain'}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: t.type === 'income' ? '#10b981' : '#f87171' }}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="ov-grid3" style={{ marginTop: '12px' }}>
        <Card>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '700' }}>Inflasi Gaya Hidup</div>
          <div style={{ fontSize: '15px', fontWeight: '800', color: lifestyleColor }}>{lifestyleStatus}</div>
        </Card>
        <Card style={{ border: suspectedSubs.length > 0 ? '1px solid #f59e0b' : '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '700' }}>Langganan Aktif</div>
          <div style={{ fontSize: '15px', fontWeight: '800', color: suspectedSubs.length > 0 ? '#f59e0b' : '#10b981' }}>
            {suspectedSubs.length} Layanan
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '700' }}>Biaya Kerja (Avg)</div>
          <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>{avgExpenseWorkHours.toFixed(1)} jam/bln</div>
        </Card>
      </div>

      {/* SECTION 3: THE JOURNEY (Long-term Goals) */}
      <div className="ov-section-title">The Journey (Masa Depan) 🚀</div>
      <div className="ov-grid2">
        <ProgressCard 
          label="FINANCIAL INDEPENDENCE (FI)" 
          current={netWorth} 
          target={fiNumber} 
          progress={fiProgress} 
          color="#8b5cf6" 
          footerLeft={`Target Kebebasan: ${fmt(fiNumber)}`} 
          footerRight={<span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Est. {yearsToFI} thn lagi</span>} 
        />
        <Card style={{ position: 'relative', overflow: 'hidden' }}>
          {nwHistory.length > 2 && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50px', opacity: 0.15, pointerEvents: 'none' }}>
              <svg width="100%" height="100%" preserveAspectRatio="none" viewBox={`0 0 ${nwHistory.length - 1} 100`}>
                <polyline fill="none" stroke={balance >= 0 ? '#10b981' : '#ef4444'} strokeWidth="6" points={nwHistory.map((h, i) => `${i},${100 - ((h.net_worth - Math.min(...nwHistory.map(x => x.net_worth))) / (Math.max(...nwHistory.map(x => x.net_worth)) - Math.min(...nwHistory.map(x => x.net_worth)) || 1)) * 100}`).join(' ')} />
              </svg>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700' }}>PERTUMBUHAN KEKAYAAN</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: balance >= 0 ? '#10b981' : '#ef4444' }}>{balance >= 0 ? '↑' : '↓'} {fmt(Math.abs(balance))}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>{balance >= 0 ? 'Akselerasi 🚀' : 'Deselerasi 📉'}</span>
          </div>
        </Card>
      </div>

      <div className="ov-grid3">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>GOALS UTAMA</span>
            <a href="/dashboard/goals" style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>Detail →</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {goalList.slice(0, 2).map(g => {
              const p = pct(g.current_amount, g.target_amount);
              return (
                <div key={g.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{g.icon} {g.name}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>{p}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p}%`, background: p >= 100 ? '#10b981' : '#3b82f6', transition: 'width 0.5s ease' }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', border: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#c084fc' }}>🏆 MILESTONE</span>
            <span style={{ fontSize: '12px', color: '#e9d5ff', fontWeight: '600' }}>{fmt(nextMilestone)}</span>
          </div>
          <div style={{ height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ height: '100%', width: `${milestoneProgress}%`, background: 'linear-gradient(90deg, #a855f7 0%, #ec4899 100%)', transition: 'width 0.8s ease' }}/>
          </div>
          <div style={{ fontSize: '11px', color: '#e9d5ff', textAlign: 'center', fontWeight: '600' }}>{milestoneProgress.toFixed(0)}% Menuju Target Berikut</div>
        </Card>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700' }}>ALOKASI ASET</span>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#10b981' }}>{cashPct}% Kas</span>
          </div>
          <div style={{ height: '14px', background: 'var(--border-color)', borderRadius: '6px', overflow: 'hidden', display: 'flex', marginBottom: '12px' }}>
            <div style={{ width: `${cashPct}%`, background: '#10b981' }}/>
             <div style={{ width: `${invPct}%`, background: '#3b82f6' }}/>
             <div style={{ width: `${otherPct}%`, background: '#94a3b8' }}/>
           </div>
           <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
             <div style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', color: 'var(--text-muted)' }}><div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '2px' }}/> Kas</div>
             <div style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', color: 'var(--text-muted)' }}><div style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '2px' }}/> Invest</div>
             <div style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', color: 'var(--text-muted)' }}><div style={{ width: '8px', height: '8px', background: '#94a3b8', borderRadius: '2px' }}/> Lain</div>
           </div>
        </Card>
      </div>

      {/* SECTION 4: THE LAB (Simulators) */}
      <div className="ov-section-title">The Lab (Simulasi & Eksperimen) 🧠</div>
      <div className="ov-grid2">
        <div className="ov-grid-inner" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Card style={{ border: '1px solid #3b82f6', background: 'rgba(59,130,246,0.06)' }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#3b82f6', marginBottom: '10px' }}>Biaya Peluang ☕</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Jika <strong style={{color: 'var(--text-main)'}}>{fmt(dailyCoffee)}</strong>/hari diinvestasikan:</div>
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#10b981' }}>~{fmt(invested20Y)}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px' }}>Dalam 20 Tahun (ROI 7%)</div>
            </div>
          </Card>
          <Card style={{ border: '1px solid #ec4899', background: 'rgba(236,72,153,0.06)' }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#ec4899', marginBottom: '10px' }}>Efek Belanja Besar 🛍️</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Beli <strong style={{color: 'var(--text-main)'}}>{fmt(bigPurchaseSample)}</strong> tunai:</div>
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#ef4444' }}>+{delayInYears.toFixed(1)} Thn Kerja ⏳</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px' }}>Pensiun Tertunda</div>
            </div>
          </Card>
        </div>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>PRIORITAS HUTANG</span>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#ef4444' }}>{fmt(totalLiabVal)}</span>
          </div>
          {liabilities.length === 0 ? <div style={{ textAlign: 'center', color: '#10b981', fontSize: '13px', fontWeight: '600', padding: '10px 0' }}>Bebas Hutang ✅</div> : (
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
              {liabilities.map((l, i) => (
                <div key={l.id} style={{ flexShrink: 0, padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>{l.name.toUpperCase()}</div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>{fmt(l.value)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Dashboard ini menggunakan algoritma finansial profesional. <a href="/dashboard/intelligence" style={{ color: '#3b82f6', fontWeight: '700', textDecoration: 'none' }}>Pelajari selengkapnya.</a></p>
      </div>
    </div>
  );
}
