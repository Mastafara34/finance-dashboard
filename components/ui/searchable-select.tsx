'use client';

import * as React from 'react';
import { ChevronDownIcon, CheckIcon, SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
  icon?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = '— pilih —',
  searchPlaceholder = 'Cari...',
  className,
  disabled,
  style,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search when opened
  React.useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  function handleSelect(val: string) {
    onValueChange(val);
    setOpen(false);
    setSearch('');
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)} style={style}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(prev => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '0 12px',
          height: '44px',
          background: 'var(--bg-secondary)',
          border: `1px solid ${open ? 'var(--border-color-strong)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius-md)',
          color: selected ? 'var(--text-main)' : 'var(--text-muted)',
          fontSize: '14px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.15s',
          outline: 'none',
          textAlign: 'left',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? `${selected.icon ? selected.icon + ' ' : ''}${selected.label}` : placeholder}
        </span>
        <ChevronDownIcon
          size={16}
          style={{
            flexShrink: 0,
            color: 'var(--text-muted)',
            opacity: 0.6,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color-md)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
            overflow: 'hidden',
            animation: 'selectDropIn 0.15s ease',
          }}
        >
          {/* Search box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <SearchIcon size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              onKeyDown={e => {
                if (e.key === 'Escape') { setOpen(false); setSearch(''); }
                if (e.key === 'Enter' && filtered.length === 1) handleSelect(filtered[0].value);
              }}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-main)',
                fontSize: '13px',
                padding: 0,
              }}
            />
          </div>

          {/* List with scrollbar */}
          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              padding: '4px',
            }}
          >
            {filtered.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Tidak ditemukan
              </div>
            ) : (
              filtered.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      padding: '9px 12px',
                      background: isSelected ? 'var(--border-color-md)' : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--border-color)';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }}
                  >
                    <span style={{ flex: 1 }}>
                      {opt.icon && <span style={{ marginRight: '6px' }}>{opt.icon}</span>}
                      {opt.label}
                    </span>
                    {isSelected && (
                      <CheckIcon size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Animation keyframe */}
      <style>{`
        @keyframes selectDropIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
