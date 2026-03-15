// lib/currency.ts
// Pure functions — no React, aman dipakai di Server Component maupun Client Component

/** Rp 1.500.000 */
export function fmtRp(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

/** 1,5jt / 500rb — untuk grafik & space terbatas */
export function fmtCompact(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}M`;
  if (amount >= 1_000_000)     return `${(amount / 1_000_000).toFixed(1)}jt`;
  if (amount >= 1_000)         return `${(amount / 1_000).toFixed(0)}rb`;
  return amount.toString();
}

/** +Rp 1.500.000 / -Rp 500.000 */
export function fmtRpSigned(amount: number): string {
  const abs  = Math.abs(Math.round(amount));
  const sign = amount >= 0 ? '+' : '-';
  return `${sign}Rp ${abs.toLocaleString('id-ID')}`;
}

/** Parse input string → angka: "1.500.000" → 1500000 */
export function parseAmount(raw: string): number {
  return parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0;
}

/** number → display untuk input field: 1500000 → "1.500.000" */
export function toInputDisplay(amount: number): string {
  return amount === 0 ? '' : amount.toLocaleString('id-ID');
}

/** Saat user ketik → { display, value } */
export function handleAmountInput(raw: string): { display: string; value: number } {
  const value   = parseAmount(raw);
  const display = toInputDisplay(value);
  return { display, value };
}
