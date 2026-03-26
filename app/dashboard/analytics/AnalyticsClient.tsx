// app/dashboard/analytics/AnalyticsClient.tsx
'use client';

import { useState, useMemo } from 'react';
import StrategicReport from './StrategicReport';

interface Transaction {
  amount: number; type: 'income'|'expense';
  date: string; categories: { name: string; icon: string }|null;
}

const fmt  = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtK = (n: number) => {
  if (n >= 1_000_000_000) return `${(n/1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)     return `${(n/1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)         return `${(n/1_000).toFixed(0)}rb`;
  return n.toString();
};
const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const CAT_COLORS  = ['#2563eb','#6366f1','#8b5cf6','#a855f7','#ec4899','#f97316','#eab308','#22c55e','#14b8a6','#06b6d4'];

// ── Components ───────────────────────────────────────────────────────────────

function BarChart({ data, maxVal, showIncome, showExpense }: {
  data:{label:string;income:number;expense:number}[];
  maxVal:number; showIncome:boolean; showExpense:boolean;
}) {
  const [tooltip, setTooltip] = useState<{x:number;y:number;d:typeof data[0]}|null>(null);
  return (
    <div style={{ position:'relative' }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap:'2px', height:'120px' }}>
        {data.map((d, i) => {
          const incH = maxVal > 0 ? Math.round((d.income/maxVal)*116) : 0;
          const expH = maxVal > 0 ? Math.round((d.expense/maxVal)*116) : 0;
          return (
            <div key={i} style={{ flex:1, display:'flex', gap:'1px', alignItems:'flex-end', height:'120px', cursor:'default' }}
              onMouseEnter={e => setTooltip({x:e.clientX,y:e.clientY,d})}
              onMouseLeave={() => setTooltip(null)}
            >
              {showIncome  && <div style={{ flex:1, height:`${Math.max(incH,d.income>0?2:0)}px`, background:'#166534', borderRadius:'2px 2px 0 0' }}/>}
              {showExpense && <div style={{ flex:1, height:`${Math.max(expH,d.expense>0?2:0)}px`, background:'#7f1d1d', borderRadius:'2px 2px 0 0' }}/>}
              {d.income===0&&d.expense===0 && <div style={{ flex:1, height:'2px', background:'var(--border-color)' }}/>}
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:'2px', marginTop:'4px' }}>
        {data.map((d,i) => (
          <div key={i} style={{ flex:1, textAlign:'center', fontSize:'9px', color:'var(--text-muted)' }}>{d.label}</div>
        ))}
      </div>
      {tooltip && (
        <div style={{
          position:'fixed', zIndex:999, left:tooltip.x+12, top:tooltip.y-60,
          background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'8px',
          padding:'8px 12px', fontSize:'12px', pointerEvents:'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
        }}>
          <div style={{ fontWeight:'600', color:'var(--text-main)', marginBottom:'4px' }}>{tooltip.d.label}</div>
          {showIncome  && <div style={{ color:'#4ade80' }}>↑ {fmt(tooltip.d.income)}</div>}
          {showExpense && <div style={{ color:'#f87171' }}>↓ {fmt(tooltip.d.expense)}</div>}
        </div>
      )}
    </div>
  );
}

// ── Main Client ──────────────────────────────────────────────────────────────

export default function AnalyticsClient({ transactions }: { transactions: Transaction[] }) {
  const [mode, setMode] = useState<'standard'|'strategic'>('standard');
  const [view, setView] = useState<'daily'|'monthly'|'yearly'>('monthly');
  const [showType, setShowType] = useState<'both'|'income'|'expense'>('both');
  const [catType,  setCatType]  = useState<'expense'|'income'>('expense');
  
  const now = new Date();
  const [targetMonth, setTargetMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  
  const availableMonths = useMemo(() => {
    const months = new Set(transactions.map(t => t.date.slice(0, 7)));
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    return Array.from(months).sort().reverse();
  }, [transactions, now]);

  const [tYear, tMonthIdx] = targetMonth.split('-').map(Number);
  const chartDaily = useMemo(() => {
    const map: Record<string,{income:number;expense:number}> = {};
    const days = new Date(tYear, tMonthIdx, 0).getDate();
    for (let i=1; i<=days; i++) {
        const d = `${tYear}-${String(tMonthIdx).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        map[d] = {income:0,expense:0};
    }
    transactions.forEach(t => { if(map[t.date]) map[t.date][t.type]+=t.amount; });
    return Object.entries(map).map(([date,v]) => ({ label:`${new Date(date).getDate()}`, ...v }));
  }, [transactions, tYear, tMonthIdx]);

  const monthlyHistory = useMemo(() => {
    const map: Record<string,{income:number;expense:number}> = {};
    for (let i=11;i>=0;i--) {
      const d = new Date(now.getFullYear(),now.getMonth()-i,1);
      map[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`] = {income:0,expense:0};
    }
    transactions.forEach(t => { const k=t.date.slice(0,7); if(map[k]) map[k][t.type]+=t.amount; });
    return Object.entries(map).map(([k,v]) => ({ label: MONTH_NAMES[parseInt(k.slice(5,7))-1].slice(0,3), ...v }));
  }, [transactions, now]);

  const yearlyHistory = useMemo(() => {
    const map: Record<string,{income:number;expense:number}> = {};
    transactions.forEach(t => { const y=t.date.slice(0,4); if(!map[y]) map[y]={income:0,expense:0}; map[y][t.type]+=t.amount; });
    return Object.entries(map).sort().map(([y,v]) => ({label:y,...v}));
  }, [transactions]);

  const chartData = useMemo(() => (view === 'daily' ? chartDaily : view === 'monthly' ? monthlyHistory : yearlyHistory), [view, chartDaily, monthlyHistory, yearlyHistory]);
  const maxVal    = Math.max(...chartData.map(d=>Math.max(d.income,d.expense)), 1);

  const mIncome     = useMemo(() => transactions.filter(t => t.date.startsWith(targetMonth) && t.type === 'income').reduce((s,t) => s + t.amount, 0), [transactions, targetMonth]);
  const mExpense    = useMemo(() => transactions.filter(t => t.date.startsWith(targetMonth) && t.type === 'expense').reduce((s,t) => s + t.amount, 0), [transactions, targetMonth]);
  const avgExpense  = useMemo(() => monthlyHistory.reduce((s,d) => s + d.expense, 0) / (monthlyHistory.length || 1), [monthlyHistory]);
  
  const weeklyData = useMemo(() => {
    const weeks: { label: string; income: number; expense: number }[] = [];
    const startOfMonth = new Date(tYear, tMonthIdx - 1, 1);
    const endOfMonth = new Date(tYear, tMonthIdx, 0);
    for (let i = 0; i < 5; i++) {
        const start = new Date(startOfMonth.getTime() + (i * 7 * 86400000));
        if (start > endOfMonth) break;
        let end = new Date(start.getTime() + (6 * 86400000));
        if (end > endOfMonth) end = endOfMonth;
        const label = `Mg ${i + 1} (${start.getDate()}-${end.getDate()})`;
        const filtered = transactions.filter(t => { const td = new Date(t.date); return td >= start && td <= end; });
        weeks.push({ label, income: filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), expense: filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) });
    }
    return weeks;
  }, [transactions, tYear, tMonthIdx]);

  const catData = useMemo(() => {
    const map: Record<string,{value:number;icon:string}> = {};
    transactions.filter(t=>t.type===catType&&t.date.startsWith(targetMonth)).forEach(t=>{
      const name=t.categories?.name??'Lain-lain';
      const icon=t.categories?.icon??'📦';
      if(!map[name]) map[name]={value:0,icon};
      map[name].value+=t.amount;
    });
    return Object.entries(map).sort((a,b)=>b[1].value-a[1].value)
      .map(([name,d],i)=>({name,icon:d.icon,value:d.value,color:CAT_COLORS[i%CAT_COLORS.length]}));
  },[transactions,catType,targetMonth]);

  const catTotal = useMemo(() => catData.reduce((s, d) => s + d.value, 0), [catData]);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding:'7px 14px', borderRadius:'10px', border:'1px solid',
    fontSize:'12px', cursor:'pointer', fontWeight:'600',
    borderColor: active?'var(--accent-primary)':'var(--border-color)',
    background: active?'rgba(37, 99, 235, 0.1)':'transparent',
    color: active?'var(--accent-primary)':'var(--text-muted)',
    transition: 'all 0.2s',
  });

  return (
    <div style={{ color:'var(--text-main)', fontFamily:'"DM Sans",system-ui,sans-serif' }}>
      <header style={{ marginBottom:'24px', display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'16px' }}>
        <div>
            <h1 style={{ fontSize:'24px', fontWeight:'800', margin:'0 0 4px', letterSpacing: '-0.5px' }}>Audit & Strategi</h1>
            <div style={{ display:'flex', gap:'8px', marginTop:'8px' }}>
                <button onClick={() => setMode('standard')} style={btnStyle(mode==='standard')}>Audit Histori Terpadu</button>
                <button onClick={() => setMode('strategic')} style={btnStyle(mode==='strategic')}>Tinjauan Strategi Kekayaan</button>
            </div>
        </div>
        <select 
            value={targetMonth} 
            onChange={e => setTargetMonth(e.target.value)}
            style={{ 
                padding:'10px 16px', borderRadius:'10px', background:'var(--card-bg)', 
                border:'1px solid var(--border-color)', color:'var(--text-main)', 
                fontSize:'13px', fontWeight:'700', outline:'none', cursor:'pointer' 
            }}
        >
            {availableMonths.map(m => {
                const [y, mm] = m.split('-');
                return <option key={m} value={m}>{MONTH_NAMES[parseInt(mm)-1]} {y}</option>
            })}
        </select>
      </header>

      {mode === 'strategic' ? (
          <StrategicReport transactions={transactions} selectedMonth={targetMonth} />
      ) : (
          <>
            {/* KPI Overview */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'12px', marginBottom:'20px' }}>
                {[ 
                  { label:'Total Masuk', value:fmt(mIncome), color:'#10b981' }, 
                  { label:'Total Keluar', value:fmt(mExpense), color:'#f87171' }, 
                  { label:'Net Surplus', value:fmt(mIncome - mExpense), color:(mIncome-mExpense)>0?'#10b981':'#f87171' } 
                ].map(k => (
                    <Card key={k.label} style={{ padding:'16px' }}>
                        <div style={{ fontSize:'10px', color:'var(--text-muted)', fontWeight:'700', marginBottom:'6px', textTransform:'uppercase' }}>{k.label}</div>
                        <div style={{ fontSize:'18px', fontWeight:'800', color:k.color }}>{k.value}</div>
                    </Card>
                ))}
            </div>

            {/* Chart Block */}
            <Card style={{ marginBottom:'20px', padding:'20px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'16px' }}>
                    <div style={{ display:'flex', gap:'6px' }}>
                        {(['daily','monthly','yearly'] as const).map(v => <button key={v} onClick={()=>setView(v)} style={btnStyle(view===v)}>{v==='daily'?'Detail Hari':v==='monthly'?'Tren Bulan':'Sejarah Tahun'}</button>)}
                    </div>
                </div>
                <BarChart data={chartData} maxVal={maxVal} showIncome={true} showExpense={true} />
            </Card>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:'14px' }}>
                {/* Categories with Labels */}
                <Card style={{ padding:'20px' }}>
                    <div style={{ fontSize:'14px', fontWeight:'800', marginBottom:'16px' }}>Dominasi Kategori ({MONTH_NAMES[tMonthIdx-1]})</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                        {catData.slice(0,6).map((d,i) => {
                            const p = Math.round((d.value/catTotal)*100);
                            return (
                                <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                                    <span style={{ fontSize:'24px', width:'30px' }}>{d.icon}</span>
                                    <div style={{ flex:1 }}>
                                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                                            <span style={{ fontSize:'12px', fontWeight:'700', color:'var(--text-main)' }}>{d.name}</span>
                                            <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>{p}%</span>
                                        </div>
                                        <div style={{ height:'6px', background:'var(--bg-secondary)', borderRadius:'99px', overflow:'hidden' }}>
                                            <div style={{ height:'100%', width:`${p}%`, background:d.color }}/>
                                        </div>
                                    </div>
                                    <span style={{ fontSize:'12px', fontWeight:'800', width:'65px', textAlign:'right' }}>{fmtK(d.value)}</span>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Weekly Monitor */}
                <Card style={{ padding:'20px' }}>
                    <div style={{ fontSize:'14px', fontWeight:'800', marginBottom:'16px' }}>Laporan Mingguan Terperinci</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'1px' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'85px 1fr 1fr', padding:'5px 8px', fontSize:'10px', color:'var(--text-muted)', textTransform:'uppercase' }}>
                            <span>Minggu</span>
                            <span style={{ textAlign:'right' }}>Masuk</span>
                            <span style={{ textAlign:'right' }}>Keluar</span>
                        </div>
                        {weeklyData.map((d,i) => (
                            <div key={i} style={{ display:'grid', gridTemplateColumns:'85px 1fr 1fr', padding:'10px 8px', borderRadius:'8px', fontSize:'13px', background: i%2===0?'transparent':'var(--bg-secondary)' }}>
                                <span style={{ fontWeight:'700' }}>{d.label}</span>
                                <span style={{ textAlign:'right', color:'#10b981' }}>{fmtK(d.income)}</span>
                                <span style={{ textAlign:'right', color:'#f87171' }}>{fmtK(d.expense)}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Monthly Monitor (New Component Style) */}
                <Card style={{ padding:'20px' }}>
                    <div style={{ fontSize:'14px', fontWeight:'800', marginBottom:'16px' }}>Monitor Histori Bulanan</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'1px' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr 1fr', padding:'5px 8px', fontSize:'10px', color:'var(--text-muted)', textTransform:'uppercase' }}>
                            <span>Bulan</span>
                            <span style={{ textAlign:'right' }}>In</span>
                            <span style={{ textAlign:'right' }}>Out</span>
                            <span style={{ textAlign:'right' }}>Net</span>
                        </div>
                        {monthlyHistory.slice().reverse().slice(0,6).map((d,i) => {
                            const diff = d.income - d.expense;
                            return (
                                <div key={i} style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr 1fr', padding:'10px 8px', borderRadius:'8px', fontSize:'13px', background: i%2===0?'transparent':'var(--bg-secondary)' }}>
                                    <span style={{ fontWeight:'800' }}>{d.label}</span>
                                    <span style={{ textAlign:'right', color:'#10b981' }}>{fmtK(d.income)}</span>
                                    <span style={{ textAlign:'right', color:'#f87171' }}>{fmtK(d.expense)}</span>
                                    <span style={{ textAlign:'right', fontWeight:'900', color:diff>=0?'#10b981':'#f87171' }}>{fmtK(diff)}</span>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
          </>
      )}
    </div>
  );
}

const Card = ({ children, style }: { children: React.ReactNode, style?: React.CSSProperties }) => (
  <div style={{ background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'14px', boxShadow: 'var(--card-shadow)', ...style }}>
    {children}
  </div>
);
