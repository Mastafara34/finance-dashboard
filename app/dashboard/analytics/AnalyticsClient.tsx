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

function DailyTab({ dailyData, avgDaily }: { dailyData: any[], avgDaily: number }) {
  return (
    <div style={{ background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'12px', padding:'20px', boxShadow: 'var(--card-shadow)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <h3 style={{ fontSize:'15px', fontWeight:'700' }}>Detail Pengeluaran Harian (30 Hari)</h3>
        <div style={{ padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
          Avg: {fmt(avgDaily)} / hari
        </div>
      </div>
      <div style={{ height: '240px', display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '40px' }}>
        {dailyData.map((d, i) => {
          const maxDaily = Math.max(...dailyData.map(x => x.expense), 1);
          const h = (d.expense / maxDaily) * 200;
          const isHigh = d.expense > (avgDaily * 1.5);
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
               <div style={{ fontSize: '9px', fontWeight: '700', color: isHigh ? '#ef4444' : 'var(--text-muted)', marginBottom: '4px' }}>
                {d.expense > 0 ? fmtK(d.expense) : ''}
              </div>
              <div style={{ 
                width: '100%', height: `${Math.max(h, d.expense > 0 ? 4 : 1)}px`, 
                background: isHigh ? '#ef4444' : 'var(--accent-primary)', 
                borderRadius: '4px 4px 0 0', opacity: d.expense > 0 ? 1 : 0.2,
                transition: 'height 0.3s ease'
              }} />
              <div style={{ 
                fontSize: '8px', color: 'var(--text-muted)', marginTop: '10px', 
                transform: 'rotate(-45deg)', transformOrigin: 'top center', whiteSpace: 'nowrap' 
              }}>
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)', fontSize: '12px', color: 'var(--text-muted)' }}>
        💡 <strong>Analisis Harian:</strong> Bar berwarna merah menunjukkan pengeluaran yang melebihi 150% dari rata-rata harian Anda.
      </div>
    </div>
  );
}

function EvaluationTab({ transactions }: { transactions: Transaction[] }) {
  const now = new Date();
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1).toISOString();
  const txs = transactions.filter(t => t.date >= yearAgo);
  const totalExpenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const avgMonthlyExpense = totalExpenses / 12 || 1;
  const fiNumber = avgMonthlyExpense * 12 * 25;
  const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const savingsRate = Math.round(((totalIncome - totalExpenses) / (totalIncome || 1)) * 100);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
      <div style={{ background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'12px', padding:'24px', boxShadow: 'var(--card-shadow)' }}>
        <h3 style={{ fontSize:'16px', fontWeight:'700', marginBottom:'20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📈</span> Efisiensi Tabungan
        </h3>
        <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>Rasio Tabungan Rata-rata</div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: savingsRate > 20 ? '#10b981' : '#f87171' }}>{savingsRate}%</div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          {savingsRate > 20 
            ? "Rasio tabungan Anda sangat sehat! Anda membangun kekayaan dengan kecepatan tinggi." 
            : "Rasio tabungan Anda di bawah standar ideal (20%). Pertimbangkan untuk meninjau kembali pengeluaran tersier."}
        </p>
      </div>
      
      <div style={{ background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'12px', padding:'24px', boxShadow: 'var(--card-shadow)' }}>
        <h3 style={{ fontSize:'16px', fontWeight:'700', marginBottom:'20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🚀</span> Target Kebebasan (FI)
        </h3>
        <div style={{ padding: '20px', border: '1px dashed var(--border-color)', borderRadius: '12px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>MODAL PENSIUN DINI</div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>{fmt(fiNumber)}</div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          Berdasarkan gaya hidup setahun terakhir ({fmt(avgMonthlyExpense)}/bln), ini adalah jumlah aset yang Anda butuhkan untuk tidak perlu bekerja lagi selamanya.
        </p>
      </div>
    </div>
  );
}

function LogicTab() {
  const formulas = [
    { title: "FI Number", formula: "Expense × 12 × 25", icon: "🏛️", text: "Teori 4% rule untuk kebebasan finansial permanen." },
    { title: "Savings Rate", formula: "(Income - Expense) / Income", icon: "💰", text: "Indikator utama kecepatan pertumbuhan kekayaan." },
    { title: "Burn Rate", formula: "Total Expense / Days", icon: "🔥", text: "Kecepatan harian Anda dalam menghabiskan uang." },
    { title: "Survival Time", formula: "Cash ÷ Burn Rate", icon: "⏳", text: "Napas finansial Anda jika hari ini kehilangan pendapatan." },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
      {formulas.map(f => (
        <div key={f.title} style={{ padding: '20px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '20px' }}>{f.icon}</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>{f.title}</span>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', marginBottom: '10px', color: '#10b981', border: '1px solid var(--border-color)' }}>
            {f.formula}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{f.text}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main Client ──────────────────────────────────────────────────────────────

import { useRouter, useSearchParams } from 'next/navigation';

export default function AnalyticsClient({ transactions, profile }: { transactions: Transaction[], profile: any }) {
  const router = useRouter();
  const sp = useSearchParams();
  const initialTab = (sp.get('tab') as any) || 'summary';
  const [activeTab, setActiveTab] = useState<'summary'|'daily'|'evaluation'|'logic'>(initialTab);
  
  const handleTabChange = (t: string) => {
    setActiveTab(t as any);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', t);
    router.push(`?${params.toString()}`, { scroll: false });
  };
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
  const avgIncome   = useMemo(() => monthlyData.reduce((s,d) => s + d.income, 0) / (monthlyData.length || 1), [monthlyData]);

  const streak = useMemo(() => {
    const days = new Set(transactions.map(t => t.date));
    let count = 0;
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
    let startOffset = !days.has(today) ? (days.has(yesterday) ? 1 : null) : 0;
    if (startOffset === null) return 0;
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
        <h1 style={{ fontSize:'24px', fontWeight:'800', margin:'0 0 4px', letterSpacing: '-0.5px' }}>Laporan & Evaluasi</h1>
        <p style={{ color:'var(--text-muted)', fontSize:'14px', margin:0 }}>Analisis mendalam & evaluasi kesehatan finansial</p>
      </header>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
        {[
          { id: 'summary', label: 'Ringkasan', icon: '📊' },
          { id: 'daily', label: 'Harian', icon: '📅' },
          { id: 'evaluation', label: 'Evaluasi AI', icon: '✨' },
          { id: 'logic', label: 'Logika', icon: '🧠' },
        ].map(t => (
          <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
            padding: '10px 18px', borderRadius: '8px 8px 0 0', border: 'none',
            background: activeTab === t.id ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
            color: activeTab === t.id ? 'var(--accent-primary)' : 'var(--text-muted)',
            fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
            borderBottom: activeTab === t.id ? '3px solid var(--accent-primary)' : '3px solid transparent',
          }}>
            <span style={{ marginRight: '6px' }}>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'12px', marginBottom:'20px' }}>
            {[
              { label:'Masuk Bln Ini', value:fmt(mIncome), color:'#10b981', sub:`Rata-rata: ${fmt(avgIncome)}` },
              { label:'Keluar Bln Ini', value:fmt(mExpense), color:'#f87171', sub:`Rata-rata: ${fmt(avgExpense)}` },
              { label:'Streak Input', value:`${streak} Hari`, color:'#fbbf24', sub: 'Kedisiplinan Bot' },
              { label:'Status vs Avg', value: avgExpense>0?`${((mExpense/avgExpense-1)*100).toFixed(0)}%`:'–', color: mExpense>avgExpense?'#f87171':'#10b981', sub:'terhadap 12 bln' },
            ].map(k => (
              <div key={k.label} style={{ background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'12px', padding:'16px', boxShadow: 'var(--card-shadow)' }}>
                <div style={{ fontSize:'10px', color:'var(--text-muted)', fontWeight:'700', marginBottom:'6px', textTransform:'uppercase' }}>{k.label}</div>
                <div style={{ fontSize:'18px', fontWeight:'800', color:k.color, marginBottom:'2px' }}>{k.value}</div>
                <div style={{ fontSize:'10px', color:'var(--text-muted)' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <Card style={{ marginBottom:'14px', padding:'20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px' }}>
              <div style={{ display:'flex', gap:'6px' }}>
                {(['monthly','yearly'] as const).map(v => <button key={v} onClick={()=>setView(v as any)} style={btnStyle(view===v)}>{v==='monthly'?'Bulanan':'Tahunan'}</button>)}
              </div>
              <div style={{ display:'flex', gap:'6px' }}>
                {(['both','income','expense'] as const).map(v => <button key={v} onClick={()=>setShowType(v)} style={btnStyle(showType===v)}>{v==='both'?'Semua':v==='income'?'Masuk':'Keluar'}</button>)}
              </div>
            </div>
            <BarChart data={chartData} maxVal={maxVal} showIncome={showType==='both'||showType==='income'} showExpense={showType==='both'||showType==='expense'} />
          </Card>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:'14px' }}>
            <Card style={{ padding:'20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                <span style={{ fontSize:'14px', fontWeight:'800' }}>Dominasi Kategori</span>
                <div style={{ display:'flex', gap:'4px' }}>
                  {(['expense','income'] as const).map(t => <button key={t} onClick={()=>setCatType(t)} style={btnStyle(catType===t)}>{t==='expense'?'Keluar':'Masuk'}</button>)}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {catData.slice(0,6).map((d,i) => {
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

            <Card style={{ padding:'20px' }}>
              <div style={{ fontSize:'14px', fontWeight:'800', marginBottom:'16px' }}>Riwayat Bulanan</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'1px' }}>
                {monthlyData.slice().reverse().slice(0,8).map((d,i) => {
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
        </>
      )}

      {activeTab === 'daily' && <DailyTab dailyData={dailyData} avgDaily={avgExpense / 30} />}
      {activeTab === 'evaluation' && <EvaluationTab transactions={transactions} />}
      {activeTab === 'logic' && <LogicTab />}
    </div>
  );
}

const Card = ({ children, style }: { children: React.ReactNode, style?: React.CSSProperties }) => (
  <div style={{ background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:'14px', boxShadow: 'var(--card-shadow)', ...style }}>
    {children}
  </div>
);
