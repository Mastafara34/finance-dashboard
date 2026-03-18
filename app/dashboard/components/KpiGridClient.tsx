'use client';

import React, { useState } from 'react';
import { KpiCard } from './DashboardComponents';

interface KpiData {
  label: string;
  value: string;
  subValue: string;
  valueColor: string;
  subColor?: string;
}

interface KpiGridClientProps {
  monthly: KpiData[];
  yearly: KpiData[];
}

export const KpiGridClient = ({ monthly, yearly }: KpiGridClientProps) => {
  const [view, setView] = useState<'monthly' | 'yearly'>('monthly');

  const data = view === 'monthly' ? monthly : yearly;

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: '16px',
        gap: '4px',
        background: 'var(--bg-primary)',
        padding: '4px',
        borderRadius: '10px',
        width: 'fit-content',
        marginLeft: 'auto',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--card-shadow)'
      }}>
        <button
          onClick={() => setView('monthly')}
          style={{
            padding: '8px 18px',
            fontSize: '12px',
            fontWeight: '700',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            background: view === 'monthly' ? 'var(--accent-primary)' : 'transparent',
            color: view === 'monthly' ? '#ffffff' : 'var(--text-muted)',
          }}
        >
          Bulanan
        </button>
        <button
          onClick={() => setView('yearly')}
          style={{
            padding: '8px 18px',
            fontSize: '12px',
            fontWeight: '700',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            background: view === 'yearly' ? 'var(--accent-primary)' : 'transparent',
            color: view === 'yearly' ? '#ffffff' : 'var(--text-muted)',
          }}
        >
          Tahunan (YTD)
        </button>
      </div>

      <div className="ov-grid6">
        {data.map((item, i) => (
          <KpiCard
            key={i}
            label={item.label}
            value={item.value}
            subValue={item.subValue}
            valueColor={item.valueColor}
            subColor={item.subColor}
          />
        ))}
      </div>
    </div>
  );
};
