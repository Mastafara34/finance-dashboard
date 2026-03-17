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
        background: '#111118',
        padding: '4px',
        borderRadius: '8px',
        width: 'fit-content',
        marginLeft: 'auto',
        border: '1px solid #1f1f2e'
      }}>
        <button
          onClick={() => setView('monthly')}
          style={{
            padding: '6px 16px',
            fontSize: '12px',
            fontWeight: '600',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: view === 'monthly' ? '#2563eb' : 'transparent',
            color: view === 'monthly' ? '#ffffff' : '#6b7280',
          }}
        >
          Bulanan
        </button>
        <button
          onClick={() => setView('yearly')}
          style={{
            padding: '6px 16px',
            fontSize: '12px',
            fontWeight: '600',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: view === 'yearly' ? '#2563eb' : 'transparent',
            color: view === 'yearly' ? '#ffffff' : '#6b7280',
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
