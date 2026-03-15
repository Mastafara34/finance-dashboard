// app/dashboard/analytics/AnalyticsClient.tsx
'use client';

import { useState, useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Transaction {
  amount: number;
  type: 'income' | 'expense';
  date: string;
  categories: { name: string; icon: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtK = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)}rb`;
  return n.toString();
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

const CAT_COLORS = [
  '#2563eb','#6366f1','#8b5cf6','#a855f7','#ec4899',
  '#f97316','#eab308','#22c55e','#14b8a6','#06b6d4',
];

// ─── Bar chart component ──────────────────────────────────────────────────────
function BarChart({
  data, maxVal, showIncome = true, showExpense = true, labelKey,
}: {
  data: { label: string; income: number; expense: number }[];
  maxVal: number;
  showIncome?: boolean;
  showExpense?: boolean;
  labelKey?: string;
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; d: typeof data[0] } | null>(null);

  return (
    <div style={{ position: 'relative' }}>
      {/* Y-axis labels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '140px' }}>
          {/* Y labels */}
          <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            height: '140px', paddingBottom: '2px', flexShrink: 0,
          }}>
            {[1, 0.75, 0.5, 0.25, 0].map(p => (
              <span key={p} style={{ fontSize: '10px', color: '#374151', textAlign: 'right', width: '36px' }}>
                {fmtK(maxVal * p)}
              </span>
            ))}
          </div>

          {/* Bars */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '3px', height: '140px', position: 'relative' }}>
            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1].map(p => (
              <div key={p} style={{
                position: 'absolute', left: 0, right: 0,
                bottom: `${p * 140}px`, height: '1px',
                background: '#1f1f2e', zIndex: 0,
              }}/>
            ))}

            {data.map((d, i) => {
              const incH = maxVal > 0 ? Math.round((d.income  / maxVal) * 136) : 0;
              const expH = maxVal > 0 ? Math.round((d.expense / maxVal) * 136) : 0;
              return (
                <div key={i}
                  style={{ flex: 1, display: 'flex', gap: '2px', alignItems: 'flex-end',
                    height: '140px', zIndex: 1, cursor: 'default' }}
                  onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, d })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {showIncome && (
                    <div style={{
                      flex: 1, height: `${Math.max(incH, d.income > 0 ? 2 : 0)}px`,
                      background: '#166534', borderRadius: '2px 2px 0 0',
                      transition: 'height .3s ease',
                    }}/>
                  )}
                  {showExpense && (
                    <div style={{
                      flex: 1, height: `${Math.max(expH, d.expense > 0 ? 2 : 0)}px`,
                      background: '#7f1d1d', borderRadius: '2px 2px 0 0',
                      transition: 'height .3s ease',
                    }}/>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* X labels */}
        <div style={{ display: 'flex', gap: '4px', marginLeft: '40px' }}>
          {data.map((d, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '10px', color: '#374151' }}>
              {d.label}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', zIndex: 999,
          left: tooltip.x + 12, top: tooltip.y - 60,
          background: '#1f1f2e', border: '1px solid #2a2a3a',
          borderRadius: '8px', padding: '8px 12px',
          fontSize: '12px', pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,.4)',
        }}>
          <div style={{ fontWeight: '600', color: '#f0f0f5', marginBottom: '4px' }}>{tooltip.d.label}</div>
          {showIncome  && <div style={{ color: '#4ade80' }}>↑ {fmt(tooltip.d.income)}</div>}
          {showExpense && <div style={{ color: '#f87171' }}>↓ {fmt(tooltip.d.expense)}</div>}
          {showIncome && showExpense && (
            <div style={{ color: tooltip.d.income - tooltip.d.expense >= 0 ? '#60a5fa' : '#fb923c',
              borderTop: '1px solid #2a2a3a', marginTop: '4px', paddingTop: '4px' }}>
              {tooltip.d.income - tooltip.d.expense >= 0 ? '+' : ''}{fmt(tooltip.d.income - tooltip.d.expense)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Donut chart component ────────────────────────────────────────────────────
function DonutChart({ data }: { data: { name: string; icon: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const [hovered, setHovered] = useState<number | null>(null);

  if (total === 0) return (
    <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: '13px' }}>
      Tidak ada data
    </div>
  );

  // Build SVG arcs
  let cumulative = 0;
  const arcs = data.map((d, i) => {
    const pct   = d.value / total;
    const start = cumulative;
    cumulative += pct;
    return { ...d, pct, start, end: cumulative, index: i };
  });

  function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(cx: number, cy: number, r: number, startPct: number, endPct: number) {
    const start = polarToCartesian(cx, cy, r, startPct * 360);
    const end   = polarToCartesian(cx, cy, r, endPct   * 360);
    const large = (endPct - startPct) > 0.5 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
  }

  const cx = 80, cy = 80, r = 60, ri = 40;

  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
      <svg width="160" height="160" style={{ flexShrink: 0 }}>
        {arcs.map((arc, i) => (
          <path key={i}
            d={arcPath(cx, cy, r, arc.start, arc.end)}
            fill="none"
            stroke={arc.color}
            strokeWidth={hovered === i ? 22 : 18}
            strokeLinecap="butt"
            style={{ transition: 'stroke-width .15s', cursor: 'default' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        {/* Inner circle */}
        <circle cx={cx} cy={cy} r={ri} fill="#111118"/>
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#9ca3af" fontSize="10">Total</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#f0f0f5" fontSize="11" fontWeight="600">
          {fmtK(total)}
        </text>
      </svg>

      {/* Legend */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {data.slice(0, 7).map((d, i) => (
          <div key={i}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'default',
              opacity: hovered !== null && hovered !== i ? 0.4 : 1, transition: 'opacity .15s' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{ width: '10px', height: '10px', borderRadius: '50%',
              background: d.color, flexShrink: 0 }}/>
            <span style={{ fontSize: '12px', color: '#9ca3af', flex: 1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {d.icon} {d.name}
            </span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#f0f0f5', flexShrink: 0 }}>
              {Math.round(d.pct * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AnalyticsClient({ transactions }: { transactions: Transaction[] }) {
  const [view,       setView]       = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [showType,   setShowType]   = useState<'both' | 'income' | 'expense'>('both');
  const [catType,    setCatType]    = useState<'expense' | 'income'>('expense');

  const now = new Date();

  // ── Daily: 30 hari terakhir ───────────────────────────────────────────────
  const dailyData = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split('T')[0];
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      map[key] = { income: 0, expense: 0 };
    }
    transactions.forEach(t => {
      if (map[t.date]) map[t.date][t.type] += t.amount;
    });
    return Object.entries(map).map(([date, v]) => ({
      label: `${new Date(date).getDate()}/${new Date(date).getMonth() + 1}`,
      ...v,
    }));
  }, [transactions]);

  // ── Monthly: 12 bulan terakhir ────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = { income: 0, expense: 0 };
    }
    transactions.forEach(t => {
      const key = t.date.slice(0, 7);
      if (map[key]) map[key][t.type] += t.amount;
    });
    return Object.entries(map).map(([key, v]) => ({
      label: MONTH_NAMES[parseInt(key.slice(5, 7)) - 1],
      ...v,
    }));
  }, [transactions]);

  // ── Yearly: per tahun dari data yang ada ──────────────────────────────────
  const yearlyData = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    transactions.forEach(t => {
      const year = t.date.slice(0, 4);
      if (!map[year]) map[year] = { income: 0, expense: 0 };
      map[year][t.type] += t.amount;
    });
    return Object.entries(map).sort().map(([year, v]) => ({ label: year, ...v }));
  }, [transactions]);

  const chartData = view === 'daily' ? dailyData : view === 'monthly' ? monthlyData : yearlyData;
  const maxVal    = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 1);

  // ── Summary bulan ini ─────────────────────────────────────────────────────
  const thisMonth   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthTx = transactions.filter(t => t.date.startsWith(thisMonth));
  const mIncome     = thisMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const mExpense    = thisMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // ── Rata-rata bulanan (12 bulan) ──────────────────────────────────────────
  const avgExpense = monthlyData.reduce((s, d) => s + d.expense, 0) / 12;
  const avgIncome  = monthlyData.reduce((s, d) => s + d.income,  0) / 12;

  // ── Kategori breakdown ────────────────────────────────────────────────────
  const catData = useMemo(() => {
    const map: Record<string, { value: number; icon: string }> = {};
    transactions
      .filter(t => t.type === catType && t.date.startsWith(thisMonth))
      .forEach(t => {
        const name = t.categories?.name ?? 'Lain-lain';
        const icon = t.categories?.icon ?? '📦';
        if (!map[name]) map[name] = { value: 0, icon };
        map[name].value += t.amount;
      });
    return Object.entries(map)
      .sort((a, b) => b[1].value - a[1].value)
      .map(([name, d], i) => ({
        name, icon: d.icon, value: d.value,
        color: CAT_COLORS[i % CAT_COLORS.length],
      }));
  }, [transactions, catType, thisMonth]);

  // ── Streak: hari berturut-turut ada transaksi ─────────────────────────────
  const streak = useMemo(() => {
    const days = new Set(transactions.map(t => t.date));
    let count = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      if (days.has(d)) count++;
      else break;
    }
    return count;
  }, [transactions]);

  // ── Bulan terbaik (terendah pengeluaran dengan ada transaksi) ─────────────
  const bestMonth = useMemo(() => {
    const active = monthlyData.filter(d => d.expense > 0);
    if (active.length === 0) return null;
    return active.reduce((min, d) => d.expense < min.expense ? d : min);
  }, [monthlyData]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ color: '#f0f0f5', fontFamily: '"DM Sans", system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 4px', letterSpacing: '-0.4px' }}>
          Analitik
        </h1>
        <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
          Tren keuangan 12 bulan terakhir
        </p>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Pemasukan Bulan Ini',  value: fmt(mIncome),    color: '#4ade80', sub: `Rata-rata: ${fmt(avgIncome)}` },
          { label: 'Pengeluaran Bulan Ini', value: fmt(mExpense),   color: '#f87171', sub: `Rata-rata: ${fmt(avgExpense)}` },
          { label: 'Input Streak',          value: `${streak} hari`, color: '#fbbf24', sub: streak > 0 ? 'Terus pertahankan!' : 'Mulai hari ini' },
          { label: 'Bulan Terbaik',         value: bestMonth?.label ?? '–', color: '#60a5fa', sub: bestMonth ? `Pengeluaran ${fmtK(bestMonth.expense)}` : 'Belum ada data' },
        ].map(k => (
          <div key={k.label} style={{
            background: '#111118', border: '1px solid #1f1f2e',
            borderRadius: '10px', padding: '14px 16px',
          }}>
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px',
              textTransform: 'uppercase', letterSpacing: '.05em' }}>{k.label}</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: k.color, marginBottom: '4px' }}>
              {k.value}
            </div>
            <div style={{ fontSize: '11px', color: '#374151' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main chart ───────────────────────────────────────────────────────── */}
      <div style={{
        background: '#111118', border: '1px solid #1f1f2e',
        borderRadius: '12px', padding: '20px', marginBottom: '16px',
      }}>
        {/* Chart controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['daily', 'monthly', 'yearly'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '6px 14px', borderRadius: '99px', border: '1px solid',
                fontSize: '12px', cursor: 'pointer', fontWeight: '500',
                borderColor: view === v ? '#2563eb' : '#2a2a3a',
                background: view === v ? '#0c1f3a' : 'transparent',
                color: view === v ? '#60a5fa' : '#6b7280',
              }}>
                {v === 'daily' ? 'Harian' : v === 'monthly' ? 'Bulanan' : 'Tahunan'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {(['both', 'income', 'expense'] as const).map(v => (
              <button key={v} onClick={() => setShowType(v)} style={{
                padding: '6px 12px', borderRadius: '99px', border: '1px solid',
                fontSize: '12px', cursor: 'pointer', fontWeight: '500',
                borderColor: showType === v ? '#2a2a3a' : '#1f1f2e',
                background: showType === v ? '#1f1f2e' : 'transparent',
                color: showType === v ? '#f0f0f5' : '#6b7280',
              }}>
                {v === 'both' ? 'Semua' : v === 'income' ? '↑ Masuk' : '↓ Keluar'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
            <span style={{ color: '#4ade80' }}>■ Pemasukan</span>
            <span style={{ color: '#f87171' }}>■ Pengeluaran</span>
          </div>
        </div>

        <BarChart
          data={chartData}
          maxVal={maxVal}
          showIncome={showType === 'both' || showType === 'income'}
          showExpense={showType === 'both' || showType === 'expense'}
        />
      </div>

      {/* ── Bottom row: Donut + Monthly table ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Category donut */}
        <div style={{
          background: '#111118', border: '1px solid #1f1f2e',
          borderRadius: '12px', padding: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#9ca3af' }}>
              Breakdown Kategori
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['expense', 'income'] as const).map(t => (
                <button key={t} onClick={() => setCatType(t)} style={{
                  padding: '4px 10px', borderRadius: '99px', border: '1px solid',
                  fontSize: '11px', cursor: 'pointer',
                  borderColor: catType === t ? '#2563eb' : '#2a2a3a',
                  background: catType === t ? '#0c1f3a' : 'transparent',
                  color: catType === t ? '#60a5fa' : '#6b7280',
                }}>
                  {t === 'expense' ? 'Keluar' : 'Masuk'}
                </button>
              ))}
            </div>
          </div>
          {catData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#6b7280', fontSize: '13px' }}>
              Tidak ada data bulan ini
            </div>
          ) : (
            <DonutChart data={catData} />
          )}
        </div>

        {/* Monthly summary table */}
        <div style={{
          background: '#111118', border: '1px solid #1f1f2e',
          borderRadius: '12px', padding: '20px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#9ca3af', marginBottom: '14px' }}>
            Ringkasan Bulanan
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr',
              padding: '6px 8px', fontSize: '11px', color: '#6b7280',
              textTransform: 'uppercase', letterSpacing: '.05em' }}>
              <span>Bulan</span>
              <span style={{ textAlign: 'right' }}>Masuk</span>
              <span style={{ textAlign: 'right' }}>Keluar</span>
              <span style={{ textAlign: 'right' }}>Selisih</span>
            </div>
            {monthlyData.slice().reverse().slice(0, 8).map((d, i) => {
              const diff = d.income - d.expense;
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr',
                  padding: '8px', borderRadius: '6px', fontSize: '12px',
                  background: i % 2 === 0 ? 'transparent' : '#0a0a0f',
                }}>
                  <span style={{ color: '#9ca3af', fontWeight: '500' }}>{d.label}</span>
                  <span style={{ textAlign: 'right', color: '#4ade80' }}>
                    {d.income > 0 ? fmtK(d.income) : '–'}
                  </span>
                  <span style={{ textAlign: 'right', color: '#f87171' }}>
                    {d.expense > 0 ? fmtK(d.expense) : '–'}
                  </span>
                  <span style={{ textAlign: 'right',
                    color: diff > 0 ? '#4ade80' : diff < 0 ? '#f87171' : '#6b7280',
                    fontWeight: '600' }}>
                    {d.income === 0 && d.expense === 0
                      ? '–'
                      : `${diff > 0 ? '+' : ''}${fmtK(diff)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
