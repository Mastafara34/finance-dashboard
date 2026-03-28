// app/dashboard/analytics/AnalyticsClient.tsx
'use client';

import { useState, useMemo } from 'react';
import StrategicReport from './StrategicReport';
import { SearchableSelect } from '@/components/ui/searchable-select';

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
const CAT_COLORS  = ['#D4D4D2', '#B5B5B3', '#969694', '#777775', '#585856', '#D9C5B2', '#BFA89E', '#A48B81', '#896E64', '#6F5147'];

// ── Components ───────────────────────────────────────────────────────────────

function BarChart({ data, maxVal, showIncome, showExpense }: {
  data:{label:string;income:number;expense:number}[];
  maxVal:number; showIncome:boolean; showExpense:boolean;
}) {
  const [tooltip, setTooltip] = useState<{x:number;y:number;d:typeof data[0]}|null>(null);
  return (
    <div style={{ position:'relative' }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap:'3px', height:'120px' }}>
        {data.map((d, i) => {
          const incH = maxVal > 0 ? Math.round((d.income/maxVal)*116) : 0;
          const expH = maxVal > 0 ? Math.round((d.expense/maxVal)*116) : 0;
          return (
            <div key={i} style={{ flex:1, display:'flex', gap:'2px', alignItems:'flex-end', height:'120px', cursor:'default' }}
              onMouseEnter={e => setTooltip({x:e.clientX,y:e.clientY,d})}
              onMouseLeave={() => setTooltip(null)}
            >
              {showIncome  && <div style={{ flex:1, height:`${Math.max(incH,d.income>0?3:0)}px`, background:'var(--color-positive)', borderRadius:'1px 1px 0 0', opacity: 0.85 }}/>}
              {showExpense && <div style={{ flex:1, height:`${Math.max(expH,d.expense>0?3:0)}px`, background:'var(--color-negative)', borderRadius:'1px 1px 0 0', opacity: 0.85 }}/>}
              {d.income===0 && d.expense===0 && <div style={{ flex:1, height:'2px', background:'var(--border-color)' }}/>}
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:'3px', marginTop:'8px' }}>
        {data.map((d,i) => (
          <div key={i} style={{ flex:1, textAlign:'center', fontSize:'12px', color:'var(--text-muted)' }}>{d.label}</div>
        ))}
      </div>
      {tooltip && (
        <div style={{
          position:'fixed', zIndex:999, left:tooltip.x+12, top:tooltip.y-60,
          background:'var(--bg-elevated)', border:'1px solid var(--border-color-md)', borderRadius:'var(--radius-md)',
          padding:'10px 14px', fontSize:'12px', pointerEvents:'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontWeight:'500', color:'var(--text-main)', marginBottom:'6px' }}>{tooltip.d.label}</div>
          {showIncome  && <div style={{ color:'var(--color-positive)', display:'flex', justifyContent:'space-between', gap:'12px' }}><span>Masuk</span> <span>{fmt(tooltip.d.income)}</span></div>}
          {showExpense && <div style={{ color:'var(--color-negative)', display:'flex', justifyContent:'space-between', gap:'12px' }}><span>Keluar</span> <span>{fmt(tooltip.d.expense)}</span></div>}
        </div>
      )}
    </div>
  );
}

// ── Main Client ──────────────────────────────────────────────────────────────

export default function AnalyticsClient({ transactions }: { transactions: Transaction[] }) {
  const [mode, setMode] = useState<'standard'|'strategic'>('standard');
  const [view, setView] = useState<'daily'|'monthly'|'yearly'>('monthly');
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
    padding:'8px 16px', borderRadius:'var(--radius-md)', border:'1px solid',
    fontSize:'13px', cursor:'pointer', fontWeight:'500',
    borderColor: active?'var(--accent-primary)':'var(--border-color-md)',
    background: active?'var(--accent-primary)':'transparent',
    color: active?'var(--accent-primary-fg)':'var(--text-muted)',
    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
  });

  return (
    <div style={{ color:'var(--text-main)', fontFamily:'var(--font-main, system-ui, sans-serif)' }}>
      <header style={{ marginBottom:'32px', display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'16px' }}>
        <div>
            <h1 style={{ fontSize:'24px', fontWeight:'600', margin:'0 0 8px', letterSpacing: '-0.3px', color:'var(--text-main)' }}>Audit & Strategi</h1>
            <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={() => setMode('standard')} style={btnStyle(mode==='standard')}>Audit Histori</button>
                <button onClick={() => setMode('strategic')} style={btnStyle(mode==='strategic')}>Tinjauan Strategi</button>
            </div>
        </div>
        <SearchableSelect
          value={targetMonth}
          onValueChange={(v) => v && setTargetMonth(v)}
          options={availableMonths.map(m => {
            const [y, mm] = m.split('-');
            return { value: m, label: `${MONTH_NAMES[parseInt(mm)-1]} ${y}` };
          })}
          style={{ width: '200px', height: '42px' }}
          placeholder="Pilih Bulan"
        />
      </header>

      {mode === 'strategic' ? (
          <StrategicReport transactions={transactions} selectedMonth={targetMonth} />
      ) : (
          <>
            {/* KPI Overview */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'12px', marginBottom:'24px' }}>
                {[ 
                  { label:'Pemasukan', value:fmt(mIncome), color:'var(--color-positive)' }, 
                  { label:'Pengeluaran', value:fmt(mExpense), color:'var(--color-negative)' }, 
                  { label:'Net Surplus', value:fmt(mIncome - mExpense), color:(mIncome-mExpense)>0?'var(--color-positive)':'var(--color-negative)' } 
                ].map(k => (
                    <Card key={k.label} style={{ padding:'20px' }}>
                        <div style={{ fontSize:'12px', color:'var(--text-muted)', fontWeight:'500', marginBottom:'8px' }}>{k.label}</div>
                        <div style={{ fontSize:'22px', fontWeight:'600', color:k.color, letterSpacing:'-0.5px' }}>{k.value}</div>
                    </Card>
                ))}
            </div>

            {/* Chart Block */}
            <Card style={{ marginBottom:'24px', padding:'24px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
                    <div style={{ display:'flex', gap:'8px' }}>
                        {(['daily','monthly','yearly'] as const).map(v => <button key={v} onClick={()=>setView(v)} style={btnStyle(view===v)}>{v==='daily'?'Detail Hari':v==='monthly'?'Tren Bulan':'Sejarah Tahun'}</button>)}
                    </div>
                </div>
                <BarChart data={chartData} maxVal={maxVal} showIncome={true} showExpense={true} />
            </Card>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:'16px' }}>
                {/* Categories */}
                <Card style={{ padding:'24px' }}>
                    <div style={{ fontSize:'14px', fontWeight:'500', marginBottom:'20px' }}>Dominasi Kategori</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                        {catData.slice(0,6).map((d,i) => {
                            const p = Math.round((d.value/catTotal)*100);
                            return (
                                <div key={i} style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                                    <span style={{ fontSize:'24px', width:'32px' }}>{d.icon}</span>
                                    <div style={{ flex:1 }}>
                                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                                            <span style={{ fontSize:'13px', fontWeight:'500', color:'var(--text-main)' }}>{d.name}</span>
                                            <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>{p}%</span>
                                        </div>
                                        <div style={{ height:'3px', background:'var(--bg-secondary)', borderRadius:'99px', overflow:'hidden' }}>
                                            <div style={{ height:'100%', width:`${p}%`, background:d.color, opacity: 0.8 }}/>
                                        </div>
                                    </div>
                                    <span style={{ fontSize:'13px', fontWeight:'500', width:'65px', textAlign:'right', color:'var(--text-main)' }}>{fmtK(d.value)}</span>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Weekly Monitor */}
                <Card style={{ padding:'24px' }}>
                    <div style={{ fontSize:'14px', fontWeight:'500', marginBottom:'20px' }}>Laporan Mingguan</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', padding:'0 12px 12px', fontSize:'12px', color:'var(--text-muted)' }}>
                            <span>Minggu</span>
                            <span style={{ textAlign:'right' }}>Masuk</span>
                            <span style={{ textAlign:'right' }}>Keluar</span>
                        </div>
                        {weeklyData.map((d,i) => (
                            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', padding:'12px', borderRadius:'var(--radius-md)', fontSize:'13px', background: i%2===0?'transparent':'var(--bg-primary)', border:'1px solid transparent' }}>
                                <span style={{ fontWeight:'500', color:'var(--text-main)' }}>{d.label}</span>
                                <span style={{ textAlign:'right', color:'var(--color-positive)' }}>{fmtK(d.income)}</span>
                                <span style={{ textAlign:'right', color:'var(--color-negative)' }}>{fmtK(d.expense)}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Monthly Monitor */}
                <Card style={{ padding:'24px' }}>
                    <div style={{ fontSize:'14px', fontWeight:'500', marginBottom:'20px' }}>Histori Bulanan</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', padding:'0 12px 12px', fontSize:'12px', color:'var(--text-muted)' }}>
                            <span>Bulan</span>
                            <span style={{ textAlign:'right' }}>In</span>
                            <span style={{ textAlign:'right' }}>Out</span>
                            <span style={{ textAlign:'right' }}>Net</span>
                        </div>
                        {monthlyHistory.slice().reverse().slice(0,6).map((d,i) => {
                            const diff = d.income - d.expense;
                            return (
                                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', padding:'12px', borderRadius:'var(--radius-md)', fontSize:'13px', background: i%2===0?'transparent':'var(--bg-primary)' }}>
                                    <span style={{ fontWeight:'500', color:'var(--text-main)' }}>{d.label}</span>
                                    <span style={{ textAlign:'right', color:'var(--color-positive)' }}>{fmtK(d.income)}</span>
                                    <span style={{ textAlign:'right', color:'var(--color-negative)' }}>{fmtK(d.expense)}</span>
                                    <span style={{ textAlign:'right', fontWeight:'600', color:diff>=0?'var(--color-positive)':'var(--color-negative)' }}>{fmtK(diff)}</span>
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
  <div style={{ 
    background:'var(--card-bg)', 
    border:'1px solid var(--border-color)', 
    borderRadius:'var(--radius-lg)', 
    boxShadow: 'none', 
    transition: 'border-color 0.2s ease',
    ...style 
  }}>
    {children}
  </div>
);
