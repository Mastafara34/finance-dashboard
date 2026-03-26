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
  Zap, Info, Activity
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

  // ── Structural Rigidity (Donut Chart) ───────────────────────────────────────
  const donutData = useMemo(() => {
    const needs = transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense' && ['Makan','Kebutuhan','Transportasi','Kesehatan','Tagihan'].includes(t.categories?.name || '')).reduce((s,t) => s + t.amount, 0);
    const wants = transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense' && ['Hiburan','Hobi','Oleh-oleh','Gadget','Belanja'].includes(t.categories?.name || '')).reduce((s,t) => s + t.amount, 0);
    const invest = surplus > 0 ? surplus : 0;
    
    return [
      { name: 'Needs', value: needs, color: '#10b981' }, // emerald-500
      { name: 'Wants', value: wants, color: '#f43f5e' }, // rose-500
      { name: 'Savings/Invest', value: invest, color: '#3b82f6' }, // blue-500
    ].filter(d => d.value > 0);
  }, [transactions, selectedMonth, surplus]);

  // ── Micro-Leak Radar ────────────────────────────────────────────────────────
  const microLeaks = useMemo(() => {
    const freq: Record<string, { count: number, amount: number, icon: string }> = {};
    transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense').forEach(t => {
      const name = t.categories?.name || 'Lainnya';
      if (!freq[name]) freq[name] = { count: 0, amount: 0, icon: t.categories?.icon || '📦' };
      freq[name].count++;
      freq[name].amount += t.amount;
    });
    return Object.entries(freq)
      .filter(([_, d]) => d.count >= 4)
      .sort((a,b) => b[1].count - a[1].count)
      .slice(0, 5);
  }, [transactions, selectedMonth]);

  return (
    <div className="bg-[#09090b] text-slate-300 p-4 md:p-10 min-h-screen font-sans antialiased text-[14px] md:text-[15px]">
      
      {/* 🚀 Header: Professional & Clean */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-white mb-2 tracking-tighter uppercase leading-tight">
            Tinjauan Strategi Kekayaan
          </h1>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <span className="bg-emerald-500/10 text-emerald-500 text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest border border-emerald-500/20">Executive Review</span>
            <p className="text-slate-500 font-semibold text-xs md:text-sm">
                Analisis Kinerja Keuangan • {monthName}
            </p>
          </div>
        </div>
      </div>

      {/* 📊 Executive Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <ExecutiveCard 
            title="Kekayaan Bersih" 
            value={fmt(150000000)}
            trend="+Rp 18.500.000 vs Bulan Lalu"
            icon={<Activity size={20} />}
            mode="success"
            sub="Pertumbuhan aset lancar Anda sehat."
        />
        <ExecutiveCard 
            title="Rasio Tabungan" 
            value={`${savingRate.toFixed(1)}%`}
            trend={savingRate >= 20 ? "Diatas Target (20%)" : "Dibawah Target"}
            icon={<Target size={22} />}
            mode={savingRate >= 20 ? 'success' : savingRate >= 10 ? 'warning' : 'danger'}
            sub="Persentase pendapatan yang berhasil disisihkan."
        />
        <ExecutiveCard 
            title="Runway Ketahanan" 
            value="4.5 Bulan"
            trend="Cukupi Hingga Agustus 2026"
            icon={<ShieldCheck size={22} />}
            mode="blue"
            sub="Durasi bertahan jika pendapatan berhenti."
        />
      </div>

      {/* 📈 Central Intelligence: Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        
        {/* Cashflow Velocity Chart */}
        <div className="lg:col-span-2 bg-zinc-900/30 border border-slate-800/60 rounded-[20px] md:rounded-[24px] p-5 md:p-8 shadow-inner backdrop-blur-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h2 className="text-lg md:text-xl font-bold text-white mb-1">Dinamika Arus Kas</h2>
                <p className="text-slate-500 text-xs text-balance">Kecepatan likuiditas harian.</p>
            </div>
            <div className="flex gap-4">
                <LegendItem label="Masuk" color="#10b981" />
                <LegendItem label="Keluar" color="#f43f5e" />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineData}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#262626" vertical={false} />
                <XAxis dataKey="hari" stroke="#525252" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip 
                    cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="masuk" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                <Area type="monotone" dataKey="keluar" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Structural Resilience */}
        <div className="bg-zinc-900/30 border border-slate-800/60 rounded-[20px] md:rounded-[24px] p-5 md:p-8 shadow-inner backdrop-blur-sm">
          <h2 className="text-lg md:text-xl font-bold text-white mb-1">Struktur Kekayaan</h2>
          <p className="text-slate-500 text-xs mb-8">Pemisahan alokasi kebutuhan vs pertumbuhan.</p>
          <div className="h-[180px] md:h-[200px] w-full flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} innerRadius={65} outerRadius={85} paddingAngle={10} dataKey="value">
                  {donutData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 space-y-4">
             {donutData.map(d => (
                 <div key={d.name} className="flex items-center justify-between group">
                     <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /> {d.name}
                     </span>
                     <span className="text-sm font-black text-white">{Math.round((d.value/(income||1))*100)}%</span>
                 </div>
             ))}
          </div>
        </div>

      </div>

      {/* 🛡️ Guard & Advisor: Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        
        {/* Micro-Leak Radar Upgrade */}
        <div className="bg-zinc-900/30 border border-slate-800/60 rounded-[20px] md:rounded-[24px] p-5 md:p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-lg md:text-xl font-bold text-white mb-1">Radar Kebocoran</h2>
                <p className="text-slate-500 text-xs">Deteksi anomali frekuensi transaksi.</p>
            </div>
            <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
            </div>
          </div>
          <div className="space-y-4">
             {microLeaks.length > 0 ? microLeaks.map(([name, data]) => (
                <div key={name} className="flex items-center justify-between p-4 bg-zinc-950/40 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-4">
                        <span className="text-2xl">{data.icon}</span>
                        <div>
                            <div className="text-sm font-bold text-white">{name}</div>
                            <div className="text-[10px] text-slate-500 uppercase font-black">{data.count} Transaksi Berulang</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-rose-500 font-black text-sm">{fmt(data.amount)}</div>
                        <span className="text-[9px] bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded font-bold uppercase">Potensi Bahaya</span>
                    </div>
                </div>
             )) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                    <Zap size={30} className="mb-4 opacity-20" />
                    <p className="text-sm italic">Sempurna. Tidak ada pola kebocoran dana terdeteksi.</p>
                </div>
             )}
          </div>
        </div>

        {/* AI Strategic Verdict Upgrade */}
        <div className="relative group rounded-[20px] md:rounded-[24px] p-[1px] bg-gradient-to-br from-emerald-500/20 via-slate-800/20 to-rose-500/20 overflow-hidden shadow-2xl">
            <div className="relative bg-[#09090b] h-full rounded-[20px] md:rounded-[24px] p-6 md:p-10 flex flex-col justify-between overflow-hidden">
                {/* Subtle Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/5 blur-[120px]" />

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6 md:mb-8">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg">
                            <BrainCircuit size={20} className="text-white animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-base md:text-lg font-black text-white uppercase tracking-widest italic leading-none">Vonis Strategis AI</h3>
                            <span className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Powered by Wealth Analysis Protocol V.4</span>
                        </div>
                    </div>
                    <div className="text-slate-300 leading-relaxed text-sm md:text-lg font-medium space-y-4">
                        <p className="italic border-l-4 border-emerald-500 pl-4 md:pl-6 py-1">
                            "{expenseChange > 10 ? "Kedisiplinan Anda mulai goyah." : "Struktur pertahanan dana Anda sangat solid."} Pengeluaran Gaya Hidup bergeser {Math.abs(expenseChange).toFixed(1)}%."
                        </p>
                        <div className="flex items-start gap-3 p-3 md:p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl md:rounded-2xl">
                            <Zap size={16} className="text-emerald-500 mt-1 flex-shrink-0" />
                            <p className="text-xs md:text-sm text-emerald-400 font-semibold leading-relaxed md:leading-normal">
                                Rekomendasi: Segera amankan {fmt(Math.max(surplus/2, 500000))} ke instrumen investasi. Amankan kas sebelum menjadi impulsif.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="relative z-10 mt-10 pt-6 border-t border-slate-800 flex justify-between items-center">
                    <div className="flex gap-4">
                        <span className="text-[10px] font-black tracking-widest text-slate-600 uppercase">Model: Elite-2.5</span>
                        <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase">Analysis: Deep Scan</span>
                    </div>
                    <ArrowRight size={16} className="text-slate-700 hover:text-white cursor-pointer transition-colors" />
                </div>
            </div>
        </div>

      </div>

      {/* 🎯 Long-term Targets Row */}
      <div className="bg-zinc-900/30 border border-slate-800/60 rounded-[24px] p-10">
        <div className="flex items-center gap-3 mb-10">
             <Target size={24} className="text-blue-500" />
             <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Pencapaian Target Strategis</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <GoalModule title="Dana Darurat" current={40} color="#10b981" />
            <GoalModule title="DP Kendaraan" current={15} color="#3b82f6" />
            <GoalModule title="Pajak Tahunan" current={100} color="#f59e0b" isComplete />
        </div>
      </div>

    </div>
  );
}

function ExecutiveCard({ title, value, trend, icon, mode, sub }: { title: string, value: string, trend: string, icon: any, mode: 'success'|'danger'|'warning'|'blue', sub: string }) {
    const modes = {
        success: 'border-emerald-500/20 text-emerald-500',
        danger: 'border-rose-500/20 text-rose-500',
        warning: 'border-amber-500/20 text-amber-500',
        blue: 'border-blue-500/20 text-blue-500'
    };
    return (
        <div className="bg-zinc-900/40 border border-slate-800/50 rounded-[20px] md:rounded-[28px] p-6 md:p-8 hover:border-slate-700 hover:bg-zinc-900/60 transition-all duration-300">
            <div className="flex justify-between items-start mb-5 md:mb-6">
                <div className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-zinc-950 border ${modes[mode]}`}>
                    {icon}
                </div>
                <div className={`text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter bg-opacity-10 ${modes[mode].split(' ')[1].replace('text-', 'bg-')}`}>
                    Live Data
                </div>
            </div>
            <div className="space-y-1">
                <h3 className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
                <div className="text-2xl md:text-3xl font-black text-white tracking-tighter">{value}</div>
            </div>
            <div className="mt-5 md:mt-6 pt-4 md:pt-5 border-t border-slate-800/50">
                <div className={`text-[10px] md:text-[11px] font-black uppercase mb-1 ${modes[mode]}`}>
                    {trend}
                </div>
                <div className="text-[9px] md:text-[10px] text-slate-600 font-medium">{sub}</div>
            </div>
        </div>
    );
}

function LegendItem({ label, color }: { label: string, color: string }) {
    return (
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            {label}
        </div>
    );
}

function GoalModule({ title, current, color, isComplete }: { title: string, current: number, color: string, isComplete?: boolean }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-end">
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h4>
                    {isComplete && <div className="text-[9px] font-black text-emerald-500 flex items-center gap-1 mt-1 uppercase"><ShieldCheck size={10}/> Target Strategis Tercapai</div>}
                </div>
                <span className={`text-xl font-black ${isComplete ? 'text-emerald-500' : 'text-white'}`}>{current}%</span>
            </div>
            <div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${current}%`, background: isComplete ? '#10b981' : color }} />
            </div>
        </div>
    )
}
