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
              {d.income===0&&d.expense===0 && <div style={{ flex:1, height:'2px', background:'#1f1f2e' }}/>}
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:'2px', marginTop:'4px' }}>
        {data.map((d,i) => (
          <div key={i} style={{ flex:1, textAlign:'center', fontSize:'9px', color:'#374151' }}>{d.label}</div>
        ))}
      </div>
      {tooltip && (
        <div style={{
          position:'fixed', zIndex:999, left:tooltip.x+12, top:tooltip.y-60,
          background:'#1f1f2e', border:'1px solid #2a2a3a', borderRadius:'8px',
          padding:'8px 12px', fontSize:'12px', pointerEvents:'none',
        }}>
          <div style={{ fontWeight:'600', color:'#f0f0f5', marginBottom:'4px' }}>{tooltip.d.label}</div>
          {showIncome  && <div style={{ color:'#4ade80' }}>↑ {fmt(tooltip.d.income)}</div>}
          {showExpense && <div style={{ color:'#f87171' }}>↓ {fmt(tooltip.d.expense)}</div>}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsClient({ transactions }: { transactions: Transaction[] }) {
  const [view,     setView]     = useState<'daily'|'monthly'|'yearly'>('monthly');
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

  const chartData = useMemo(() => {
    if (view === 'daily') return dailyData;
    if (view === 'monthly') return monthlyData;
    return yearlyData;
  }, [view, dailyData, monthlyData, yearlyData]);

  const maxVal    = Math.max(...chartData.map(d=>Math.max(d.income,d.expense)), 1);

  const mIncome     = monthlyData[monthlyData.length - 1]?.income ?? 0;
  const mExpense    = monthlyData[monthlyData.length - 1]?.expense ?? 0;
  const avgExpense  = useMemo(() => monthlyData.reduce((s,d) => s + d.expense, 0) / (monthlyData.length || 1), [monthlyData]);
  const avgIncome   = useMemo(() => monthlyData.reduce((s,d) => s + d.income, 0) / (monthlyData.length || 1), [monthlyData]);

  const streak = useMemo(() => {
    const days = new Set(transactions.map(t => t.date));
    let count = 0;
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

    // Start counting from today, or from yesterday if today's entry is missing
    let startOffset = 0;
    if (!days.has(today)) {
      if (days.has(yesterday)) startOffset = 1;
      else return 0;
    }

    for (let i = startOffset; i < 365; i++) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0];
      if (days.has(d)) count++; else break;
    }
    return count;
  }, [transactions]);

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
    padding:'6px 12px', borderRadius:'99px', border:'1px solid',
    fontSize:'12px', cursor:'pointer', fontWeight:'500',
    borderColor: active?'#2563eb':'#2a2a3a',
    background: active?'#0c1f3a':'transparent',
    color: active?'#60a5fa':'#6b7280',
  });

  return (
    <div style={{ color:'#f0f0f5', fontFamily:'"DM Sans",system-ui,sans-serif' }}>
      <style>{`
        .an-kpi { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
        .an-bottom { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        @media (max-width:768px) {
          .an-kpi { grid-template-columns:repeat(2,1fr); gap:8px; }
          .an-bottom { grid-template-columns:1fr; gap:10px; }
        }
      `}</style>

      <div style={{ marginBottom:'20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize:'20px', fontWeight:'600', margin:'0 0 4px' }}>Analitik</h1>
          <p style={{ color:'#6b7280', fontSize:'13px', margin:0 }}>Tren keuangan 12 bulan terakhir</p>
        </div>
        <a href="/dashboard/reports" style={{ 
          padding: '8px 16px', background: '#1e1b4b', color: '#818cf8', borderRadius: '8px', 
          fontSize: '12px', fontWeight: '600', textDecoration: 'none', border: '1px solid #312e81'
        }}>
          📄 Laporan & Evaluasi
        </a>
      </div>

      {/* KPI */}
      <div className="an-kpi">
        {[
          { label:'Pemasukan Bln Ini', value:fmt(mIncome), color:'#4ade80', sub:`Rata-rata: ${fmt(avgIncome)}` },
          { label:'Pengeluaran Bln Ini', value:fmt(mExpense), color:'#f87171', sub:`Rata-rata: ${fmt(avgExpense)}` },
          { label:'Input Streak', value:`${streak} hari`, color:'#fbbf24', sub: streak>0?'Pertahankan!':'Mulai hari ini' },
          { label:'Bulan Ini vs Avg', value: avgExpense>0?`${((mExpense/avgExpense-1)*100).toFixed(0)}%`:'–',
            color: mExpense>avgExpense?'#f87171':'#4ade80', sub:'vs rata-rata 12 bln' },
        ].map(k => (
          <div key={k.label} style={{ background:'#111118', border:'1px solid #1f1f2e', borderRadius:'10px', padding:'12px 14px' }}>
            <div style={{ fontSize:'10px', color:'#6b7280', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'.05em' }}>{k.label}</div>
            <div style={{ fontSize:'16px', fontWeight:'700', color:k.color, marginBottom:'3px' }}>{k.value}</div>
            <div style={{ fontSize:'10px', color:'#374151' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Main chart */}
      <div style={{ background:'#111118', border:'1px solid #1f1f2e', borderRadius:'12px', padding:'16px', marginBottom:'14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px', flexWrap:'wrap', gap:'8px' }}>
          <div style={{ display:'flex', gap:'4px' }}>
            {(['daily','monthly','yearly'] as const).map(v => (
              <button key={v} onClick={()=>setView(v as any)} style={btnStyle(view===v)}>
                {v==='daily'?'Harian':v==='monthly'?'Bulanan':'Tahunan'}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:'4px' }}>
            {(['both','income','expense'] as const).map(v => (
              <button key={v} onClick={()=>setShowType(v)} style={btnStyle(showType===v)}>
                {v==='both'?'Semua':v==='income'?'↑ Masuk':'↓ Keluar'}
              </button>
            ))}
          </div>
        </div>
        <BarChart data={chartData} maxVal={maxVal}
          showIncome={showType==='both'||showType==='income'}
          showExpense={showType==='both'||showType==='expense'}
        />
      </div>

      {/* Bottom: Donut + Table */}
      <div className="an-bottom">
        {/* Kategori */}
        <div style={{ background:'#111118', border:'1px solid #1f1f2e', borderRadius:'12px', padding:'16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
            <span style={{ fontSize:'13px', fontWeight:'500', color:'#9ca3af' }}>Kategori Bulan Ini</span>
            <div style={{ display:'flex', gap:'4px' }}>
              {(['expense','income'] as const).map(t => (
                <button key={t} onClick={()=>setCatType(t)} style={btnStyle(catType===t)}>
                  {t==='expense'?'Keluar':'Masuk'}
                </button>
              ))}
            </div>
          </div>
          {catData.length===0 ? (
            <div style={{ textAlign:'center', padding:'20px', color:'#6b7280', fontSize:'13px' }}>Tidak ada data</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {catData.slice(0,6).map((d,i) => {
                const p = catTotal>0?Math.round((d.value/catTotal)*100):0;
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontSize:'16px', flexShrink:0 }}>{d.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                        <span style={{ fontSize:'12px', fontWeight:'500', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</span>
                        <span style={{ fontSize:'11px', color:'#6b7280', flexShrink:0, marginLeft:'6px' }}>{p}%</span>
                      </div>
                      <div style={{ height:'4px', background:'#1f1f2e', borderRadius:'99px', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:'99px', width:`${p}%`, background:d.color }}/>
                      </div>
                    </div>
                    <span style={{ fontSize:'11px', color:'#9ca3af', flexShrink:0, minWidth:'50px', textAlign:'right' }}>{fmtK(d.value)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Monthly table */}
        <div style={{ background:'#111118', border:'1px solid #1f1f2e', borderRadius:'12px', padding:'16px' }}>
          <div style={{ fontSize:'13px', fontWeight:'500', color:'#9ca3af', marginBottom:'12px' }}>Ringkasan Bulanan</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'1px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'50px 1fr 1fr 1fr', padding:'5px 6px',
              fontSize:'10px', color:'#6b7280', textTransform:'uppercase', letterSpacing:'.05em' }}>
              <span>Bln</span>
              <span style={{ textAlign:'right' }}>Masuk</span>
              <span style={{ textAlign:'right' }}>Keluar</span>
              <span style={{ textAlign:'right' }}>Selisih</span>
            </div>
            {monthlyData.slice().reverse().slice(0,8).map((d,i) => {
              const diff = d.income-d.expense;
              return (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'50px 1fr 1fr 1fr',
                  padding:'7px 6px', borderRadius:'5px', fontSize:'12px',
                  background: i%2===0?'transparent':'#0a0a0f' }}>
                  <span style={{ color:'#9ca3af', fontWeight:'500' }}>{d.label}</span>
                  <span style={{ textAlign:'right', color:'#4ade80' }}>{d.income>0?fmtK(d.income):'–'}</span>
                  <span style={{ textAlign:'right', color:'#f87171' }}>{d.expense>0?fmtK(d.expense):'–'}</span>
                  <span style={{ textAlign:'right', fontWeight:'600',
                    color:diff>0?'#4ade80':diff<0?'#f87171':'#6b7280' }}>
                    {d.income===0&&d.expense===0?'–':`${diff>0?'+':''}${fmtK(diff)}`}
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
