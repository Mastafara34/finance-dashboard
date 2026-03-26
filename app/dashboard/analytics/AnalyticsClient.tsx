// app/dashboard/analytics/AnalyticsClient.tsx
'use client';

import { useState, useMemo } from 'react';

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
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
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
  const [view,       setView]     = useState<'daily'|'monthly'|'yearly'>('monthly');
  const [showType, setShowType] = useState<'both'|'income'|'expense'>('both');
  const [catType,  setCatType]  = useState<'expense'|'income'>('expense');
  const now = new Date();
  const thisMonth = useMemo(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, [now]);

  const dailyData = useMemo(() => {
    const map: Record<string,{income:number;expense:number}> = {};
    for (let i=29;i>=0;i--) {
      const d = new Date(Date.now()-i*86400000);
      map[d.toISOString().split('T')[0]] = {income:0,expense:0};
    }
    transactions.forEach(t => { if(map[t.date]) map[t.date][t.type]+=t.amount; });
    return Object.entries(map).map(([date,v]) => ({
      label:`${new Date(date).getDate()}/${new Date(date).getMonth()+1}`, ...v,
    }));
  }, [transactions]);

  const monthlyData = useMemo(() => {
    const map: Record<string,{income:number;expense:number}> = {};
    for (let i=11;i>=0;i--) {
      const d = new Date(now.getFullYear(),now.getMonth()-i,1);
      map[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`] = {income:0,expense:0};
    }
    transactions.forEach(t => { const k=t.date.slice(0,7); if(map[k]) map[k][t.type]+=t.amount; });
    return Object.entries(map).map(([k,v]) => ({ label:MONTH_NAMES[parseInt(k.slice(5,7))-1], ...v }));
  }, [transactions]);

  const yearlyData = useMemo(() => {
    const map: Record<string,{income:number;expense:number}> = {};
    transactions.forEach(t => {
      const y=t.date.slice(0,4);
      if(!map[y]) map[y]={income:0,expense:0};
      map[y][t.type]+=t.amount;
    });
    return Object.entries(map).sort().map(([y,v]) => ({label:y,...v}));
  }, [transactions]);

  const chartData = useMemo(() => (view === 'daily' ? dailyData : view === 'monthly' ? monthlyData : yearlyData), [view, dailyData, monthlyData, yearlyData]);
  const maxVal    = Math.max(...chartData.map(d=>Math.max(d.income,d.expense)), 1);

  const mIncome     = monthlyData[monthlyData.length - 1]?.income ?? 0;
  const mExpense    = monthlyData[monthlyData.length - 1]?.expense ?? 0;
  const avgExpense  = useMemo(() => monthlyData.reduce((s,d) => s + d.expense, 0) / (monthlyData.length || 1), [monthlyData]);
  
  // ── Weekly Breakdown (Specific User Request) ──────────────────────────
  const weeklyData = useMemo(() => {
    const weeks: { label: string; income: number; expense: number }[] = [];
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    for (let i = 0; i < 5; i++) {
      const start = new Date(startOfMonth.getTime() + (i * 7 * 86400000));
      if (start.getMonth() !== now.getMonth()) break;
      const end = new Date(start.getTime() + (6 * 86400000));
      const label = `Mg ${i + 1} (${start.getDate()}-${end.getDate() > 31 ? 31 : end.getDate()})`;
      
      const filtered = transactions.filter(t => {
        const td = new Date(t.date);
        return td >= start && td <= end;
      });
      
      weeks.push({
        label,
        income: filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      });
    }
    return weeks;
  }, [transactions, now]);

  const catData = useMemo(() => {
    const map: Record<string,{value:number;icon:string}> = {};
    transactions.filter(t=>t.type===catType&&t.date.startsWith(thisMonth)).forEach(t=>{
      const name=t.categories?.name??'Lain-lain';
      const icon=t.categories?.icon??'📦';
      if(!map[name]) map[name]={value:0,icon};
      map[name].value+=t.amount;
    });
    return Object.entries(map).sort((a,b)=>b[1].value-a[1].value)
      .map(([name,d],i)=>({name,icon:d.icon,value:d.value,color:CAT_COLORS[i%CAT_COLORS.length]}));
  },[transactions,catType,thisMonth]);

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
      <header style={{ marginBottom:'24px' }}>
        <h1 style={{ fontSize:'24px', fontWeight:'800', margin:'0 0 4px', letterSpacing: '-0.5px' }}>Analitik Terperinci</h1>
        <p style={{ color:'var(--text-muted)', fontSize:'14px', margin:0 }}>Monitor arus kas mingguan dan bulanan Anda.</p>
      </header>

      {/* KPI */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'12px', marginBottom:'20px' }}>
        {[
          { label:'Income Bln Ini', value:fmt(mIncome), color:'#10b981' },
          { label:'Expense Bln Ini', value:fmt(mExpense), color:'#f87171' },
          { label:'Rata-rata Expense', value:fmt(avgExpense), color:'var(--text-muted)' },
          { label:'Surplus Bln Ini', value:fmt(mIncome - mExpense), color:(mIncome-mExpense)>0?'#10b981':'#f87171' },
        ].map(k => (
          <div key={k.label} style={{ background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'12px', padding:'16px', boxShadow: 'var(--card-shadow)' }}>
            <div style={{ fontSize:'10px', color:'var(--text-muted)', fontWeight:'700', marginBottom:'6px', textTransform:'uppercase' }}>{k.label}</div>
            <div style={{ fontSize:'18px', fontWeight:'800', color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Main Chart */}
      <Card style={{ marginBottom:'20px', padding:'20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px' }}>
           <div style={{ display:'flex', gap:'6px' }}>
            {(['daily','monthly','yearly'] as const).map(v => <button key={v} onClick={()=>setView(v as any)} style={btnStyle(view===v)}>{v==='daily'?'Hari':v==='monthly'?'Bulan':'Tahun'}</button>)}
          </div>
          <div style={{ display:'flex', gap:'6px' }}>
            {(['both','income','expense'] as const).map(v => <button key={v} onClick={()=>setShowType(v)} style={btnStyle(showType===v)}>{v==='both'?'Semua':v==='income'?'Masuk':'Keluar'}</button>)}
          </div>
        </div>
        <BarChart data={chartData} maxVal={maxVal} showIncome={showType==='both'||showType==='income'} showExpense={showType==='both'||showType==='expense'} />
      </Card>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:'14px' }}>
        
        {/* Kategori */}
        <Card style={{ padding:'20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
            <span style={{ fontSize:'14px', fontWeight:'800' }}>Dominasi Kategori ({MONTH_NAMES[now.getMonth()]})</span>
            <div style={{ display:'flex', gap:'4px' }}>
              {(['expense','income'] as const).map(t => <button key={t} onClick={()=>setCatType(t)} style={btnStyle(catType===t)}>{t==='expense'?'Keluar':'Masuk'}</button>)}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {catData.slice(0,8).map((d,i) => {
              const p = catTotal>0?Math.round((d.value/catTotal)*100):0;
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontSize:'18px' }}>{d.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                      <span style={{ fontSize:'13px', fontWeight:'600' }}>{d.name}</span>
                      <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>{p}%</span>
                    </div>
                    <div style={{ height:'5px', background:'var(--bg-secondary)', borderRadius:'99px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${p}%`, background:d.color }}/>
                    </div>
                  </div>
                  <span style={{ fontSize:'12px', fontWeight:'700', width:'60px', textAlign:'right' }}>{fmtK(d.value)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Laporan Mingguan */}
        <Card style={{ padding:'20px' }}>
          <div style={{ fontSize:'14px', fontWeight:'800', marginBottom:'16px' }}>Laporan Mingguan ({MONTH_NAMES[now.getMonth()]})</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'1px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr', padding:'5px 8px', fontSize:'10px', color:'var(--text-muted)', textTransform:'uppercase' }}>
              <span>Minggu</span>
              <span style={{ textAlign:'right' }}>Masuk</span>
              <span style={{ textAlign:'right' }}>Keluar</span>
            </div>
            {weeklyData.map((d,i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr', padding:'10px 8px', borderRadius:'8px', fontSize:'13px', background: i%2===0?'transparent':'var(--bg-secondary)' }}>
                <span style={{ fontWeight:'700' }}>{d.label}</span>
                <span style={{ textAlign:'right', color:'#10b981' }}>{fmtK(d.income)}</span>
                <span style={{ textAlign:'right', color:'#f87171' }}>{fmtK(d.expense)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Riwayat Bulanan */}
        <Card style={{ padding:'20px' }}>
          <div style={{ fontSize:'14px', fontWeight:'800', marginBottom:'16px' }}>Laporan Bulanan (History)</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'1px' }}>
            {monthlyData.slice().reverse().slice(0,6).map((d,i) => {
              const diff = d.income-d.expense;
              return (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'60px 1fr 1fr 1fr', padding:'10px 8px', borderRadius:'8px', fontSize:'13px', background: i%2===0?'transparent':'var(--bg-secondary)' }}>
                  <span style={{ fontWeight:'700' }}>{d.label}</span>
                  <span style={{ textAlign:'right', color:'#10b981' }}>{fmtK(d.income)}</span>
                  <span style={{ textAlign:'right', color:'#f87171' }}>{fmtK(d.expense)}</span>
                  <span style={{ textAlign:'right', fontWeight:'800', color:diff>0?'#10b981':'#f87171' }}>{fmtK(diff)}</span>
                </div>
              );
            })}
          </div>
        </Card>

      </div>
    </div>
  );
}

const Card = ({ children, style }: { children: React.ReactNode, style?: React.CSSProperties }) => (
  <div style={{ background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'14px', boxShadow: 'var(--card-shadow)', ...style }}>
    {children}
  </div>
);
