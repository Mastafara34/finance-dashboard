// app/dashboard/analytics/StrategicReport.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Clock, ShieldCheck, 
  AlertTriangle, BrainCircuit, Target, ArrowRight, 
  Zap, Info, Activity, Fingerprint, PieChart as PieIcon
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
    <div className="bg-[#09090b] text-slate-300 p-4 md:p-10 min-h-screen font-sans antialiased text-[14px]">
      
      {/* 🚀 Header: Professional & Sleek */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-white mb-2 tracking-tighter uppercase leading-tight">
            Tinjauan Strategi Kekayaan
          </h1>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <span className="bg-emerald-500/10 text-emerald-500 text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest border border-emerald-500/20">Elite Pulse Analysis</span>
            <p className="text-slate-500 font-semibold text-xs md:text-sm italic">
                {monthName} • Sistem Analitik Mendalam
            </p>
          </div>
        </div>
      </div>

      {/* 🔮 Top Strategy Engine: Verdict + Category List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          {/* AI Strategy Verdict (High Visual) */}
          <div className="relative p-[1px] rounded-[24px] bg-gradient-to-br from-emerald-500/30 via-slate-800 to-rose-500/30 overflow-hidden shadow-2xl">
              <div className="relative bg-[#09090b] rounded-[24px] p-8 md:p-11 flex flex-col justify-between h-full group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                      {/* Strategic Score Meter */}
                      <div className="flex flex-col items-center shrink-0">
                          <div className="relative w-32 h-32 flex items-center justify-center">
                              <svg className="w-full h-full -rotate-90">
                                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-900" />
                                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray="364.4" strokeDashoffset={364.4 - (strategicScore / 100 * 364.4)} className="text-emerald-500 transition-all duration-1000" />
                              </svg>
                              <div className="absolute flex flex-col items-center">
                                  <span className="text-3xl font-black text-white">{strategicScore}</span>
                                  <span className="text-[8px] font-bold uppercase text-slate-500">Status</span>
                              </div>
                          </div>
                      </div>

                      <div className="flex-1 space-y-6">
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                  <BrainCircuit size={18} className="text-emerald-500" />
                              </div>
                              <h3 className="text-lg font-black text-white uppercase tracking-widest italic leading-none">Vonis Strategis AI</h3>
                          </div>
                          <p className="text-slate-300 font-medium text-lg leading-relaxed italic border-l-4 border-emerald-500/40 pl-6">
                              "{expenseChange > 10 ? "Kedisiplinan Anda terdeteksi melonggar." : "Pertahanan kapital bulan ini sangat kokoh."} Pengeluaran Gaya Hidup bergeser {Math.abs(expenseChange).toFixed(1)}%."
                          </p>
                          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex gap-3">
                              <Zap size={18} className="text-emerald-500 mt-1 shrink-0" />
                              <p className="text-sm font-bold text-emerald-400">Rekomendasi Utama: Segera sterilkan {fmt(Math.max(surplus/2, 1000000))} ke instrumen pasar uang untuk mengunci pertumbuhan.</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* Dominasi Kategori (With Labels) */}
          <div className="bg-zinc-900/30 border border-slate-800/60 rounded-[28px] p-8 md:p-10 backdrop-blur-md">
            <div className="flex justify-between items-center mb-10">
                <div>
                   <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Dominasi Kategori Terpilih</h2>
                   <p className="text-slate-500 text-xs">Peringkat 5 pengeluaran terbesar periode ini.</p>
                </div>
                <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center"><PieIcon size={20}/></div>
            </div>
            <div className="space-y-6">
                {detailedCats.map(([name, d], idx) => {
                    const pct = Math.round((d.value / (expense || 1)) * 100);
                    return (
                        <div key={name} className="group cursor-default">
                           <div className="flex justify-between items-center mb-2">
                               <div className="flex items-center gap-3">
                                   <span className="text-2xl transition-transform group-hover:scale-125 duration-300">{d.icon}</span>
                                   <span className="text-sm font-black text-white uppercase tracking-widest">{name}</span>
                               </div>
                               <div className="text-right">
                                   <div className="text-sm font-black text-white">{fmt(d.value)}</div>
                                   <div className="text-[10px] font-bold text-slate-500">{pct}% dari Total</div>
                               </div>
                           </div>
                           <div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                               <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${pct}%` }} />
                           </div>
                        </div>
                    );
                })}
            </div>
          </div>
      </div>

      {/* 🚀 Middle Tier: Execution & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
        {/* Cashflow Velocity */}
        <div className="bg-zinc-900/30 border border-slate-800/60 rounded-[28px] p-8 md:p-10">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-tighter mb-1">Dinamika Aliran Kas</h2>
                    <p className="text-slate-500 text-xs text-balance">Distribusi likuiditas masuk vs keluar harian.</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Masuk</div>
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-rose-500 uppercase"><div className="w-2 h-2 rounded-full bg-rose-500"/> Keluar</div>
                </div>
            </div>
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={lineData}>
                      <defs>
                        <linearGradient id="cI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                        <linearGradient id="cO" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis dataKey="hari" stroke="#525252" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius:'8px' }} />
                      <Area type="monotone" dataKey="masuk" stroke="#10b981" strokeWidth={2} fill="url(#cI)" />
                      <Area type="monotone" dataKey="keluar" stroke="#f43f5e" strokeWidth={2} fill="url(#cO)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Micro-Leak Radar Upgrade (Visual Meter) */}
        <div className="bg-zinc-900/30 border border-slate-800/60 rounded-[28px] p-8 md:p-10 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-tighter mb-1">Radar Kebocoran Halus</h2>
                    <p className="text-slate-500 text-xs">Identifikasi intensitas pengeluaran frekuensi tinggi.</p>
                </div>
                <Fingerprint className="text-amber-500 opacity-30" size={30} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {microLeaks.map(([name, data]) => {
                    const intensity = Math.min((data.count / 10) * 100, 100);
                    return (
                        <div key={name} className="bg-zinc-950 p-5 rounded-2xl border border-slate-800/40 hover:border-amber-500/30 transition-all text-center">
                            <span className="text-3xl mb-3 block">{data.icon}</span>
                            <div className="text-xs font-black text-white uppercase mb-1">{name}</div>
                            <div className="text-rose-500 font-bold mb-3">{fmt(data.amount)}</div>
                            <div className="h-1 bg-slate-800 rounded-full mb-1">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${intensity}%` }} />
                            </div>
                            <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none">{data.count}X TERDETEKSI</div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* 🛡️ Bottom Row: Executive KPI & Targets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <MiniCard title="Kekayaan Bersih" value={fmt(150000000)} icon={<TrendingUp size={16}/>} />
        <MiniCard title="Rasio Tabungan" value={`${savingRate.toFixed(1)}%`} icon={<Target size={16}/>} />
        <MiniCard title="Napas Finansial" value="4.5 Bln" icon={<Clock size={16}/>} />
        <MiniCard title="Defisit/Surplus" value={fmt(surplus)} icon={<Activity size={16}/>} isPrice />
      </div>

    </div>
  );
}

function MiniCard({ title, value, icon, isPrice }: { title: string, value: string, icon: any, isPrice?: boolean }) {
    return (
        <div className="bg-zinc-900/50 border border-slate-800 rounded-2xl p-6 hover:bg-zinc-900 transition-all">
            <div className="flex items-center gap-3 text-slate-500 mb-3">
                <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">{icon}</div>
                <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
            </div>
            <div className={`text-xl font-black ${isPrice && value.includes('-') ? 'text-rose-500' : 'text-white'}`}>{value}</div>
        </div>
    )
}
