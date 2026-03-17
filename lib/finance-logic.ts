// lib/finance-logic.ts
/**
 * Utility untuk semua kalkulasi finansial cerdas.
 * Memisahkan logika dari UI agar mudah diuji dan dikelola.
 */

export const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
export const pct = (v: number, t: number) => t > 0 ? Math.round((v / t) * 100) : 0;

export interface Transaction {
  amount: number;
  type: 'income' | 'expense';
  date: string;
  categories: { name: string } | null;
}

export interface Asset {
  id: string;
  name: string;
  value: number;
  is_liability: boolean;
  type: string;
}

/**
 * Menghitung rata-rata pengeluaran bulanan yang stabil.
 * Menggunakan data 3 bulan terakhir jika tersedia.
 */
export function calculateMonthlyExpBase(currentExp: number, prevExp: number, olderExp: number = 0): number {
  const months = [currentExp, prevExp, olderExp].filter(v => v > 0);
  if (months.length === 0) return 0;
  return months.reduce((s, v) => s + v, 0) / months.length;
}

/**
 * Menghitung FI Countdown dengan bunga berbunga (Compound Interest).
 * Rumus: Log( (Target * Rate/12 + Surplus) / (CurrentNetWorth * Rate/12 + Surplus) ) / Log(1 + Rate/12)
 */
export function calculateYearsToFI(netWorth: number, target: number, monthlySurplus: number, annualRate: number = 0.07): string {
  if (netWorth >= target) return "Sudah FI! 🥂";
  if (monthlySurplus <= 0) return "∞ (Surplus negatif)";

  const r = annualRate / 12;
  const S = monthlySurplus;
  const T = target;
  const P = netWorth;

  // Rumus N (jumlah bulan)
  // N = log((T*r + S) / (P*r + S)) / log(1 + r)
  const nMonths = Math.log((T * r + S) / (P * r + S)) / Math.log(1 + r);
  
  if (isNaN(nMonths) || nMonths < 0) return "∞";
  return (nMonths / 12).toFixed(1);
}

/**
 * Skor Kesehatan Finansial (0-100)
 */
export function calculateHealthScore(params: {
  savingRate: number;
  monthsCovered: number;
  debtRatio: number;
  monthlyInvRatio: number;
  isSurplus: boolean;
}) {
  const { savingRate, monthsCovered, debtRatio, monthlyInvRatio, isSurplus } = params;
  
  const s1 = Math.min((savingRate / 20) * 20, 20); // Save > 20%
  const s2 = Math.min((monthsCovered / 6) * 20, 20); // EF > 6 months
  const s3 = debtRatio <= 30 ? 20 : Math.max(0, 20 - ((debtRatio - 30) / 2)); // Debt < 30%
  const s4 = Math.min((monthlyInvRatio / 15) * 20, 20); // Invest > 15%
  const s5 = isSurplus ? 20 : 0;

  const score = Math.round(s1 + s2 + s3 + s4 + s5);
  return {
    score,
    label: score >= 80 ? 'Sangat Sehat' : score >= 60 ? 'Sehat' : score >= 40 ? 'Cukup' : 'Perlu Perhatian',
    color: score >= 80 ? '#4ade80' : score >= 60 ? '#60a5fa' : score >= 40 ? '#f59e0b' : '#f87171'
  };
}

/**
 * Deteksi Arketipe Finansial
 */
export function detectArchetype(params: {
  savingRate: number;
  investmentRatio: number;
  monthsCovered: number;
  debtRatio: number;
}) {
  const { savingRate, investmentRatio, monthsCovered, debtRatio } = params;
  if (savingRate > 40 && investmentRatio > 30) return 'The Wealth Accelerator 🚀';
  if (monthsCovered > 12 && debtRatio === 0) return 'The Fortress 🏰';
  if (savingRate < 10 && debtRatio > 30) return 'The Overstretched ⚠️';
  if (investmentRatio > 50) return 'The Aggressive Builder 🏗️';
  if (savingRate > 20 && monthsCovered < 3) return 'The Vulnerable Earner 🛡️';
  return 'The Balanced Strategist';
}
