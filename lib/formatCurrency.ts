/**
 * lib/formatCurrency.ts
 * ======================
 * Shared utility untuk format angka ke format Rupiah.
 * Dipakai di semua komponen web — konsisten, tidak perlu duplikasi.
 */

// ─── Display format ───────────────────────────────────────────────────────────

/** "1500000" → "Rp 1.500.000" */
export function fmtRp(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

/** "1500000" → "1,5jt" — untuk grafik / space terbatas */
export function fmtCompact(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}M`;
  if (amount >= 1_000_000)     return `${(amount / 1_000_000).toFixed(1)}jt`;
  if (amount >= 1_000)         return `${(amount / 1_000).toFixed(0)}rb`;
  return amount.toString();
}

/** "1500000" → "+Rp 1.500.000" atau "-Rp 1.500.000" */
export function fmtRpSigned(amount: number): string {
  const abs = Math.abs(Math.round(amount));
  const sign = amount >= 0 ? '+' : '-';
  return `${sign}Rp ${abs.toLocaleString('id-ID')}`;
}

// ─── Input helpers ────────────────────────────────────────────────────────────

/** Parse string input (boleh ada titik/koma/spasi) → number */
export function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
}

/** number → display string untuk input field: "1500000" → "1.500.000" */
export function toInputDisplay(amount: number): string {
  if (amount === 0) return '';
  return amount.toLocaleString('id-ID');
}

/** Saat user ketik di input → update display & return nilai numerik */
export function handleAmountInput(raw: string): { display: string; value: number } {
  const value   = parseAmount(raw);
  const display = value === 0 ? '' : value.toLocaleString('id-ID');
  return { display, value };
}

// ─── React hook ───────────────────────────────────────────────────────────────

import { useState } from 'react';

/**
 * Hook untuk input nominal Rupiah.
 * Otomatis format saat blur, angka biasa saat fokus.
 *
 * Usage:
 *   const amt = useAmountInput(initialValue);
 *   <input {...amt.inputProps} />
 *   // amt.value = number
 */
export function useAmountInput(initialValue = 0) {
  const [value,   setValue]   = useState<number>(initialValue);
  const [display, setDisplay] = useState<string>(toInputDisplay(initialValue));
  const [focused, setFocused] = useState(false);

  const inputProps = {
    type:        'text' as const,
    inputMode:   'numeric' as const,
    value:       display,
    placeholder: '0',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const { display: d, value: v } = handleAmountInput(e.target.value);
      setDisplay(d);
      setValue(v);
    },
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      // Saat fokus: tampilkan angka tanpa separator agar mudah diedit
      setDisplay(value === 0 ? '' : value.toString());
      e.target.style.borderColor = '#2563eb';
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      // Saat blur: format dengan separator ribuan
      setDisplay(toInputDisplay(value));
      e.target.style.borderColor = '#2a2a3a';
    },
  };

  /** Reset ke nilai baru */
  function reset(newValue = 0) {
    setValue(newValue);
    setDisplay(toInputDisplay(newValue));
  }

  return { value, display, focused, inputProps, reset };
}

// ─── Styled input component ───────────────────────────────────────────────────

import React from 'react';

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  accentColor?: string;
  style?: React.CSSProperties;
}

/**
 * Komponen input nominal Rupiah siap pakai.
 * Prefix "Rp" otomatis, format ribuan otomatis, validasi otomatis.
 *
 * Usage:
 *   <AmountInput value={amount} onChange={setAmount} />
 */
export function AmountInput({
  value,
  onChange,
  placeholder = '0',
  disabled = false,
  accentColor = '#2563eb',
  style,
}: AmountInputProps) {
  const [display, setDisplay] = useState<string>(toInputDisplay(value));

  // Sync display kalau value berubah dari luar
  React.useEffect(() => {
    setDisplay(toInputDisplay(value));
  }, [value]);

  const baseStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px 10px 32px',
    background: disabled ? '#0a0a0f' : '#0a0a0f',
    border: '1px solid #2a2a3a',
    borderRadius: '8px', color: disabled ? '#6b7280' : '#f0f0f5',
    fontSize: '13px', outline: 'none',
    boxSizing: 'border-box',
    cursor: disabled ? 'not-allowed' : 'text',
    ...style,
  };

  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: '10px', top: '50%',
        transform: 'translateY(-50%)', fontSize: '12px',
        color: '#6b7280', pointerEvents: 'none', userSelect: 'none',
      }}>Rp</span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        placeholder={placeholder}
        disabled={disabled}
        style={baseStyle}
        onChange={e => {
          const { display: d, value: v } = handleAmountInput(e.target.value);
          setDisplay(d);
          onChange(v);
        }}
        onFocus={e => {
          setDisplay(value === 0 ? '' : value.toString());
          if (!disabled) e.target.style.borderColor = accentColor;
        }}
        onBlur={e => {
          setDisplay(toInputDisplay(value));
          e.target.style.borderColor = '#2a2a3a';
        }}
      />
      {value > 0 && (
        <div style={{
          fontSize: '10px', color: '#6b7280',
          marginTop: '3px', paddingLeft: '2px',
        }}>
          {fmtRp(value)}
        </div>
      )}
    </div>
  );
}
