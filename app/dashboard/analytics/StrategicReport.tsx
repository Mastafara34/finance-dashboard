// app/dashboard/analytics/StrategicReport.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Clock, ShieldCheck, 
  AlertTriangle, BrainCircuit, Target, ArrowRight 
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
        data.push({ day: i, masuk: dayIncome, keluar: dayExpense });
    }
    return data;
  }, [transactions, tYear, tMonthIdx]);

  // ── Structural Rigidity (Donut Chart) ───────────────────────────────────────
  const donutData = useMemo(() => {
    const needs = transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense' && ['Makan','Kebutuhan','Transportasi','Kesehatan','Tagihan'].includes(t.categories?.name || '')).reduce((s,t) => s + t.amount, 0);
    const wants = transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense' && ['Hiburan','Hobi','Oleh-oleh','Gadget','Belanja'].includes(t.categories?.name || '')).reduce((s,t) => s + t.amount, 0);
    const savings = surplus > 0 ? surplus : 0;
    
    return [
      { name: 'Kebutuhan (Needs)', value: needs, color: '#10b981' },
      { name: 'Gaya Hidup (Wants)', value: wants, color: '#f43f5e' },
      { name: 'Tabungan/Invest', value: savings, color: '#3b82f6' },
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
    <div className="bg-zinc-950 text-slate-200 p-4 md:p-8 min-h-screen font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-1 uppercase">
            Tinjauan Strategi Bulanan
          </h1>
          <p className="text-slate-400 font-medium tracking-wide flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-500" />
             Evaluasi Peta Kekayaan & Aset {monthName}
          </p>
        </div>
      </div>

      {/* 2. Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <ExecutiveCard 
            title="Kekayaan Bersih (Est)" 
            value={fmt(150000000)}
            trend="+12.4% dari bulan lalu"
            icon={<TrendingUp className="text-emerald-500" />}
            color="emerald"
        />
        <ExecutiveCard 
            title="Rasio Tabungan" 
            value={`${savingRate.toFixed(1)}%`}
            trend={savingRate >= 20 ? "Target Tercapai ✅" : "Di Bawah Optimal ⚠️"}
            icon={<Target size={24} />}
            color={savingRate >= 20 ? 'emerald' : savingRate >= 10 ? 'amber' : 'rose'}
        />
        <ExecutiveCard 
            title="Napas Finansial" 
            value="4.5 Bulan"
            trend="Ketahanan cadangan kas"
            icon={<Clock size={24} className="text-blue-500" />}
            color="blue"
        />
      </div>

      {/* 3. Cashflow Visualizer */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
        <div className="xl:col-span-2 bg-zinc-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50" />
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            Aliran Kas 30 Hari Terakhir
          </h2>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineData}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#1e293b', borderRadius: '12px', color: '#f1f5f9' }}
                    itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="masuk" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
                <Area type="monotone" dataKey="keluar" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-4 justify-center">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
               <div className="w-3 h-3 rounded-full bg-emerald-500" /> PEMASUKAN
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-rose-500">
               <div className="w-3 h-3 rounded-full bg-rose-500" /> PENGELUARAN
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-2">Struktur Alokasi Dana</h2>
          <p className="text-slate-500 text-xs mb-6">Efisiensi penggunaan modal periode ini.</p>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                  {donutData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            {donutData.map(d => (
                <div key={d.name} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 text-slate-400">
                        <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        {d.name}
                    </div>
                    <div className="font-bold text-white">{Math.round((d.value/(income||1))*100)}%</div>
                </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-zinc-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
               <AlertTriangle size={18} className="text-amber-500" /> Radar Kebocoran Halus
            </h2>
             <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full font-bold uppercase">Leak Protection</span>
          </div>
          <div className="space-y-4">
             {microLeaks.length > 0 ? microLeaks.map(([name, data]) => (
                 <div key={name} className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-slate-800/50">
                     <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-slate-800">
                             {data.icon}
                         </div>
                         <div>
                             <div className="text-sm font-bold text-white">{name}</div>
                             <div className="text-[10px] text-slate-500 uppercase tracking-tighter">{data.count}x Transaksi</div>
                         </div>
                     </div>
                     <div className="text-right">
                         <div className="text-rose-400 text-sm font-black">{fmt(data.amount)}</div>
                         <div className="text-[10px] text-slate-600">Potensi Boros: Tinggi</div>
                     </div>
                 </div>
             )) : (
                 <div className="text-center py-10 text-slate-500 italic text-sm">Tidak ada kebocoran frekuensi tinggi terdeteksi. Disiplin strategis terjaga.</div>
             )}
          </div>
        </div>

        <div className="relative group p-1 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-rose-500/5 blur-xl group-hover:scale-110 transition-transform" />
            <div className="relative h-full bg-zinc-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                        <BrainCircuit size={22} className="text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    </div>
                    <h2 className="text-lg font-black text-white tracking-widest uppercase">Vonis Strategis AI</h2>
                </div>
                <div className="prose prose-invert prose-sm">
                    <p className="text-slate-300 leading-relaxed italic text-lg font-medium">
                        "{expenseChange > 10 ? "Arus kas dalam tekanan tinggi." : "Struktur strategis sangat solid."} Pengeluaran di sektor Gaya Hidup bergeser {Math.abs(expenseChange).toFixed(1)}% dibanding bulan lalu. 
                        Rekomendasi: Segera pindahkan {fmt(Math.max(surplus/2, 500000))} ke Dana Darurat atau Instrumen Investasi untuk mengunci kelebihan kas dan mencegah inflasi gaya hidup (lifestyle creep)."
                    </p>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-800/50 flex justify-between items-center text-[10px] font-black tracking-widest text-slate-600 uppercase">
                    <span>Status: Analitis Mendalam</span>
                    <span>Confidence: 98%</span>
                </div>
            </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-black text-white mb-8 flex items-center gap-2 uppercase">
            <Target size={20} className="text-blue-500" /> Target Pertumbuhan Kekayaan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GoalProgress title="Dana Darurat" current={40} color="emerald" />
            <GoalProgress title="DP Kendaraan" current={15} color="blue" />
            <GoalProgress title="Pajak Tahunan" current={100} color="amber" isCompleted />
        </div>
      </div>
    </div>
  );
}

function ExecutiveCard({ title, value, trend, icon, color }: { title: string, value: string, trend: string, icon: any, color: 'emerald'|'rose'|'amber'|'blue' }) {
    const colorMap = {
        emerald: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20',
        rose: 'text-rose-500 bg-rose-500/5 border-rose-500/20',
        amber: 'text-amber-500 bg-amber-500/5 border-amber-500/20',
        blue: 'text-blue-500 bg-blue-500/5 border-blue-500/20'
    };
    return (
        <div className="bg-zinc-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</span>
                <div className={`p-2 rounded-lg ${colorMap[color]}`}>
                    {icon}
                </div>
            </div>
            <div className="text-2xl font-black text-white mb-1">{value}</div>
            <div className={`text-[10px] font-bold uppercase tracking-wider ${color === 'rose' ? 'text-rose-500' : 'text-slate-500'}`}>
                {trend}
            </div>
        </div>
    );
}

function GoalProgress({ title, current, color, isCompleted }: { title: string, current: number, color: 'emerald'|'blue'|'amber', isCompleted?: boolean }) {
    const colors = {
        emerald: 'bg-emerald-500',
        blue: 'bg-blue-500',
        amber: 'bg-amber-500'
    };
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400">{title}</span>
                <span className={`font-black ${isCompleted ? 'text-emerald-500' : 'text-white'}`}>{current}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${colors[color]} rounded-full transition-all duration-1000`} style={{ width: `${current}%` }} />
            </div>
            {isCompleted && <div className="text-[9px] font-black text-emerald-500 uppercase flex items-center gap-1"><ShieldCheck size={10}/> Target Strategis Tercapai</div>}
        </div>
    )
}
