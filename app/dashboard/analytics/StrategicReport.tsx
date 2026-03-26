// app/dashboard/analytics/StrategicReport.tsx
'use client';

import React, { useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  ShieldCheck, AlertTriangle, BrainCircuit, Target, 
  Zap, TrendingUp, Clock, Activity, PieChart as PieIcon
} from 'lucide-react';

interface Transaction {
  amount: number; type: 'income'|'expense';
  date: string; categories: { name: string; icon: string }|null;
}

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

export default function StrategicReport({ transactions, selectedMonth }: { transactions: Transaction[], selectedMonth: string }) {
  const [tYear, tMonthIdx] = selectedMonth.split('-').map(Number);
  const monthName = new Date(tYear, tMonthIdx-1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  // ── Executive Derived Data ──────────────────────────────────────────────────
  const income = useMemo(() => transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'income').reduce((s,t) => s + t.amount, 0), [transactions, selectedMonth]);
  const expense = useMemo(() => transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense').reduce((s,t) => s + t.amount, 0), [transactions, selectedMonth]);
  const surplus = income - expense;
  const savingRate = income > 0 ? (surplus / income) * 100 : 0;
  
  // Historical trend
  const prevMonthStr = `${tMonthIdx === 1 ? tYear - 1 : tYear}-${String(tMonthIdx === 1 ? 12 : tMonthIdx - 1).padStart(2, '0')}`;
  const prevExpense = transactions.filter(t => t.date.startsWith(prevMonthStr) && t.type === 'expense').reduce((s,t) => s + t.amount, 0);
  const expenseChange = prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : 0;

  // ── Strategic Score (Visual Intelligence) ──────────────────────────────────
  const strategicScore = useMemo(() => {
    let score = 50; 
    if (savingRate > 20) score += 20; else if (savingRate < 10) score -= 10;
    if (expenseChange < 0) score += 15; else if (expenseChange > 15) score -= 15;
    if (surplus > 0) score += 15;
    return Math.min(Math.max(score, 0), 100);
  }, [savingRate, expenseChange, surplus]);

  // ── Cashflow Chart Data ──────────────────────────────────────
  const lineData = useMemo(() => {
    const days = new Date(tYear, tMonthIdx, 0).getDate();
    const data = [];
    for (let i = 1; i <= days; i++) {
        const dStr = `${tYear}-${String(tMonthIdx).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const dayIncome = transactions.filter(t => t.date === dStr && t.type === 'income').reduce((s,t) => s + t.amount, 0);
        const dayExpense = transactions.filter(t => t.date === dStr && t.type === 'expense').reduce((s,t) => s + t.amount, 0);
        data.push({ hari: i, masuk: dayIncome, keluar: dayExpense });
    }
    return data;
  }, [transactions, tYear, tMonthIdx]);

  // ── Category Dominance (Detailed Labels) ───────────────────────────────────
  const detailedCats = useMemo(() => {
    const map: Record<string,{icon:string; value:number}> = {};
    transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense').forEach(t => {
        const name = t.categories?.name || 'Umum';
        if (!map[name]) map[name] = { icon: t.categories?.icon || '📦', value: 0 };
        map[name].value += t.amount;
    });
    return Object.entries(map).sort((a,b) => b[1].value - a[1].value).slice(0, 5);
  }, [transactions, selectedMonth]);

  // ── Micro-Leak Radar ────────────────────────────────────────────────────────
  const microLeaks = useMemo(() => {
    const freq: Record<string, { count: number, amount: number, icon: string }> = {};
    transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense').forEach(t => {
      const name = t.categories?.name || 'Lainnya';
      if (!freq[name]) freq[name] = { count: 0, amount: 0, icon: t.categories?.icon || '📦' };
      freq[name].count++;
      freq[name].amount += t.amount;
    });
    return Object.entries(freq).filter(([_, d]) => d.count >= 4).sort((a,b) => b[1].count - a[1].count).slice(0,3);
  }, [transactions, selectedMonth]);

  return (
    <div style={{ background:'var(--bg-secondary)', color:'var(--text-main)', minHeight:'100vh', padding: '0 0 40px' }}>
      
      {/* 🚀 Header: Strategic Analysis */}
      <div style={{ marginBottom:'32px' }}>
          <h1 style={{ fontSize:'24px', fontWeight:'800', marginBottom:'4px', letterSpacing:'-0.5px' }}>
            Tinjauan Strategi Kekayaan
          </h1>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontSize:'10px', fontWeight:'800', color:'var(--accent-primary)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Analysis Mode: Strategic Review</span>
            <span style={{ fontSize:'12px', color:'var(--text-muted)', fontWeight:'500' }}>• {monthName}</span>
          </div>
      </div>

      {/* 🔮 Primary Strategy Engine */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:'20px', marginBottom:'24px' }}>
          
          {/* AI Strategy Verdict (Standard Card but Better Content) */}
          <Card style={{ padding:'24px', borderLeft:'4px solid var(--accent-primary)' }}>
              <div style={{ display:'flex', gap:'20px', alignItems:'flex-start', flexWrap:'wrap' }}>
                  {/* Score Meter */}
                  <div style={{ position:'relative', width:'90px', height:'90px', flexShrink:0 }}>
                      <svg width="90" height="90" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border-color)" strokeWidth="8"/>
                          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent-primary)" strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (strategicScore/100 * 283)} style={{ transition:'stroke-dashoffset 1s ease' }}/>
                      </svg>
                      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                          <span style={{ fontSize:'20px', fontWeight:'900' }}>{strategicScore}</span>
                          <span style={{ fontSize:'8px', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase' }}>SCORE</span>
                      </div>
                  </div>

                  <div style={{ flex:1, minWidth:'180px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                          <BrainCircuit size={16} color="var(--accent-primary)" />
                          <h3 style={{ fontSize:'13px', fontWeight:'800', textTransform:'uppercase', color:'var(--text-main)' }}>Vonis Strategis AI</h3>
                      </div>
                      <p style={{ fontSize:'14px', lineHeight:'1.5', color:'var(--text-main)', marginBottom:'16px', fontWeight:'500' }}>
                        "{expenseChange > 10 ? "Kedisiplinan Anda mulai melonggar." : "Pertahanan finansial bulan ini sangat solid."} Struktur pengeluaran bergeser {Math.abs(expenseChange).toFixed(1)}%."
                      </p>
                      <div style={{ background:'rgba(37, 99, 235, 0.05)', padding:'12px', borderRadius:'10px', display:'flex', gap:'8px', border:'1px solid rgba(37, 99, 235, 0.1)' }}>
                          <Zap size={16} color="var(--accent-primary)" style={{ flexShrink:0, marginTop:'2px' }} />
                          <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent-primary)', margin: 0 }}>
                            Rekomendasi: Amankan {fmt(Math.max(surplus/2, 1000000))} ke instrumen investasi untuk mengunci surplus kas.
                          </p>
                      </div>
                  </div>
              </div>
          </Card>

          {/* Top Categories List */}
          <Card>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
                <div>
                   <h3 style={{ fontSize:'13px', fontWeight:'700', color:'var(--text-main)', textTransform:'uppercase' }}>Dominasi Pengeluaran</h3>
                   <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>Top 5 Alokasi Modal</span>
                </div>
                <PieIcon size={18} color="var(--text-muted)" />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                {detailedCats.map(([name, d]) => {
                    const pct = Math.round((d.value / (expense || 1)) * 100);
                    return (
                        <div key={name}>
                           <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px', alignItems:'center' }}>
                               <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                   <span style={{ fontSize:'18px' }}>{d.icon}</span>
                                   <span style={{ fontSize:'12px', fontWeight:'700', color:'var(--text-main)' }}>{name}</span>
                               </div>
                               <span style={{ fontSize:'12px', fontWeight:'800', color:'var(--text-main)' }}>{fmt(d.value)}</span>
                           </div>
                           <div style={{ height:'6px', background:'var(--border-color)', borderRadius:'99px', overflow:'hidden' }}>
                               <div style={{ height:'100%', width:`${pct}%`, background:'var(--accent-primary)', opacity:0.8, borderRadius:'99px' }} />
                           </div>
                        </div>
                    );
                })}
            </div>
          </Card>
      </div>

      {/* 🚀 Middle Tier: Execution & Analysis */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:'20px', marginBottom:'24px' }}>
          
        {/* Cashflow BarChart (Integrated Style) */}
        <Card>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
                <h3 style={{ fontSize:'13px', fontWeight:'700', color:'var(--text-main)', textTransform:'uppercase' }}>Arus Kas Harian</h3>
                <div style={{ display:'flex', gap:'12px', fontSize:'10px', fontWeight:'700', textTransform:'uppercase' }}>
                    <div style={{ color:'#10b981' }}>↑ Masuk</div>
                    <div style={{ color:'#f43f5e' }}>↓ Keluar</div>
                </div>
            </div>
            <div style={{ height:'200px', width:'100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={lineData}>
                      <defs>
                        <linearGradient id="cI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                        <linearGradient id="cO" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis dataKey="hari" stroke="var(--text-muted)" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius:'8px', color: 'var(--text-main)' }} />
                      <Area type="monotone" dataKey="masuk" stroke="#10b981" strokeWidth={2} fill="url(#cI)" />
                      <Area type="monotone" dataKey="keluar" stroke="#f43f5e" strokeWidth={2} fill="url(#cO)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>

        {/* Micro-Leak Detection Cards */}
        <Card>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
                <h3 style={{ fontSize:'13px', fontWeight:'700', color:'var(--text-main)', textTransform:'uppercase' }}>Radar Kebocoran Halus</h3>
                <AlertTriangle size={18} color="#f59e0b" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(100px, 1fr))', gap:'12px' }}>
                {microLeaks.map(([name, data]) => {
                    const intensity = Math.min((data.count / 10) * 100, 100);
                    return (
                        <div key={name} style={{ background:'rgba(255,255,255,0.02)', padding:'12px', borderRadius:'10px', border:'1px solid var(--border-color)', textAlign:'center' }}>
                            <span style={{ fontSize:'24px', display:'block', marginBottom:'8px' }}>{data.icon}</span>
                            <div style={{ fontSize:'10px', fontWeight:'800', color:'var(--text-main)', textTransform:'uppercase', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{name}</div>
                            <div style={{ color:'#f87171', fontWeight:'900', fontSize:'12px', margin:'4px 0' }}>{fmt(data.amount)}</div>
                            <div style={{ height:'3px', background:'var(--border-color)', borderRadius:'99px', margin:'4px 0' }}>
                                <div style={{ height:'100%', width: `${intensity}%`, background:'#f59e0b', borderRadius:'99px' }} />
                            </div>
                            <div style={{ fontSize:'8px', fontWeight:'800', color:'var(--text-muted)', textTransform:'uppercase' }}>{data.count}x Transaksi</div>
                        </div>
                    );
                })}
            </div>
        </Card>
      </div>

      {/* 🛡️ Strategic KPI Row (Unified mini-cards) */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'16px' }}>
        <KpiBar title="Net Wealth" value={fmt(150000000)} icon={<TrendingUp size={14}/>} color="var(--accent-primary)" />
        <KpiBar title="Saving Rate" value={`${savingRate.toFixed(1)}%`} icon={<Target size={14}/>} color={savingRate > 20 ? "#10b981" : "#f59e0b"} />
        <KpiBar title="Napas Finansial" value="4.5 Bln" icon={<Clock size={14}/>} color="#3b82f6" />
        <KpiBar title="Status Arus Kas" value={surplus > 0 ? 'Surplus' : 'Defisit'} icon={<Activity size={14}/>} color={surplus > 0 ? "#10b981" : "#f43f5e"} />
      </div>

    </div>
  );
}

const Card = ({ children, style }: { children: React.ReactNode, style?: React.CSSProperties }) => (
  <div style={{ 
    background:'var(--card-bg)', 
    border:'1px solid var(--border-color)', 
    borderRadius:'12px', 
    padding:'20px',
    boxShadow: 'var(--card-shadow)',
    ...style 
  }}>
    {children}
  </div>
);

function KpiBar({ title, value, icon, color }: { title: string, value: string, icon: any, color: string }) {
    return (
        <Card style={{ padding:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', color:'var(--text-muted)', marginBottom:'8px' }}>
                <div style={{ width:'24px', height:'24px', borderRadius:'6px', background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border-color)' }}>
                    {icon}
                </div>
                <span style={{ fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.05em' }}>{title}</span>
            </div>
            <div style={{ fontSize:'18px', fontWeight:'800', color: 'var(--text-main)' }}>{value}</div>
            <div style={{ height:'4px', background:'var(--border-color)', borderRadius:'99px', marginTop:'10px' }}>
                <div style={{ height:'100%', width:'30%', background:color, borderRadius:'99px', opacity:0.6 }} />
            </div>
        </Card>
    );
}
