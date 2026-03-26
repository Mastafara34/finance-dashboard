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
  <div className={className} style={{ boxShadow: 'var(--card-shadow)', ...style }}>
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

export const KpiCard = ({ label, value, subValue, subColor = 'var(--text-muted)', valueColor = 'var(--text-main)' }: KpiCardProps) => (
  <Card>
    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: '600' }}>{label}</div>
    <div style={{ fontSize: '20px', fontWeight: '700', color: valueColor, letterSpacing: '-0.5px' }}>
      {value}
    </div>
    {subValue && (
      <div style={{ fontSize: '11px', color: subColor, marginTop: '4px', fontWeight: '500' }}>
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

export const ProgressCard = ({ label, current, target, progress, color = 'var(--accent-primary)', footerLeft, footerRight, title }: ProgressCardProps) => (
  <Card>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>{label}</span>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>{fmt(current)} / {fmt(target)}</span>
    </div>
    <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: '99px',
        width: `${progress}%`,
        background: color,
        transition: 'width 0.5s ease-in-out'
      }}/>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>{footerLeft}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: '11px', color: color, fontWeight: '700', display: 'block' }}>
          {progress}% Terpenuhi
        </span>
        {footerRight}
      </div>
    </div>
  </Card>
);

export const EmptyState = ({ message = "Belum ada data.", icon = "🔍" }: { message?: string; icon?: string }) => (
  <div style={{ 
    padding: '40px 20px', textAlign: 'center', background: 'var(--card-bg)', 
    border: '1px dashed var(--border-color)', borderRadius: '16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'
  }}>
    <div style={{ fontSize: '32px', filter: 'grayscale(0.5)' }}>{icon}</div>
    <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600' }}>{message}</div>
  </div>
);
