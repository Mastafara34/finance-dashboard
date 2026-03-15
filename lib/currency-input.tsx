// lib/currency-input.tsx
// 'use client' — hanya dipakai di Client Components
'use client';

import { useState, useEffect } from 'react';
import { parseAmount, toInputDisplay, handleAmountInput, fmtRp } from './currency';

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAmountInput(initialValue = 0) {
  const [value,   setValue]   = useState<number>(initialValue);
  const [display, setDisplay] = useState<string>(toInputDisplay(initialValue));

  const inputProps = {
    type:      'text' as const,
    inputMode: 'numeric' as const,
    value:     display,
    placeholder: '0',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const { display: d, value: v } = handleAmountInput(e.target.value);
      setDisplay(d);
      setValue(v);
    },
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      setDisplay(value === 0 ? '' : value.toString());
      e.target.style.borderColor = '#2563eb';
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      setDisplay(toInputDisplay(value));
      e.target.style.borderColor = '#2a2a3a';
    },
  };

  function reset(newValue = 0) {
    setValue(newValue);
    setDisplay(toInputDisplay(newValue));
  }

  return { value, display, inputProps, reset };
}

// ─── Component ────────────────────────────────────────────────────────────────
interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  accentColor?: string;
  required?: boolean;
  style?: React.CSSProperties;
}

export function AmountInput({
  value,
  onChange,
  placeholder = '0',
  disabled = false,
  accentColor = '#2563eb',
  required = false,
  style,
}: AmountInputProps) {
  const [display, setDisplay] = useState<string>(toInputDisplay(value));

  // Sync kalau value berubah dari luar
  useEffect(() => {
    setDisplay(toInputDisplay(value));
  }, [value]);

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
        required={required}
        style={{
          width: '100%', padding: '10px 12px 10px 32px',
          background: '#0a0a0f', border: '1px solid #2a2a3a',
          borderRadius: '8px',
          color: disabled ? '#6b7280' : '#f0f0f5',
          fontSize: '16px', // 16px cegah iOS zoom
          outline: 'none', boxSizing: 'border-box',
          cursor: disabled ? 'not-allowed' : 'text',
          ...style,
        }}
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
        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>
          {fmtRp(value)}
        </div>
      )}
    </div>
  );
}
