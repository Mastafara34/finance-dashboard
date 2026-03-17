// app/dashboard/components/DashboardComponents.tsx
import React from 'react';

export const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
export const pct = (v: number, t: number) => t > 0 ? Math.round((v / t) * 100) : 0;

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export const Card = ({ children, style, className = "ov-card" }: CardProps) => (
  <div className={className} style={style}>
    {children}
  </div>
);

interface KpiCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  subColor?: string;
  valueColor?: string;
}

export const KpiCard = ({ label, value, subValue, subColor = '#94a3b8', valueColor = '#f0f0f5' }: KpiCardProps) => (
  <Card>
    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
    <div style={{ fontSize: '20px', fontWeight: '700', color: valueColor, letterSpacing: '-0.5px' }}>
      {value}
    </div>
    {subValue && (
      <div style={{ fontSize: '11px', color: subColor, marginTop: '4px' }}>
        {subValue}
      </div>
    )}
  </Card>
);

interface ProgressCardProps {
  label: string;
  current: number;
  target: number;
  progress: number;
  color?: string;
  footerLeft?: string;
  footerRight?: React.ReactNode;
  title?: string;
}

export const ProgressCard = ({ label, current, target, progress, color = '#2563eb', footerLeft, footerRight, title }: ProgressCardProps) => (
  <Card>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '500' }}>{label}</span>
      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{fmt(current)} / {fmt(target)}</span>
    </div>
    <div style={{ height: '6px', background: '#1f1f2e', borderRadius: '99px', overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: '99px',
        width: `${progress}%`,
        background: color,
      }}/>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{footerLeft}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: '11px', color: color, fontWeight: '600', display: 'block' }}>
          {progress}% Terpenuhi
        </span>
        {footerRight}
      </div>
    </div>
  </Card>
);
