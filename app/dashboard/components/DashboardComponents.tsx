// app/dashboard/components/DashboardComponents.tsx
//
// ✅ Semua props API tidak berubah — tidak ada breaking change
// ✅ Visual upgrade: warm neutral tokens, tipografi lebih ketat, spacing lebih bersih
// ✅ Tambahan: DividerLine, StatRow, TransactionItem, SectionHeader
//
import React from 'react';

/* ─── Formatters ─────────────────────────────────────────────────────────────── */
export const fmt = (n: number) =>
  `Rp ${Math.round(n).toLocaleString('id-ID')}`;

export const pct = (v: number, t: number) =>
  t > 0 ? Math.round((v / t) * 100) : 0;

export const fmtShort = (n: number): string => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)         return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return fmt(n);
};

/* ─── Card ───────────────────────────────────────────────────────────────────── */
interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

export const Card = ({
  children,
  style,
  className = 'ov-card',
  onClick,
}: CardProps) => (
  <div
    className={className}
    onClick={onClick}
    style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      boxShadow: 'var(--card-shadow)',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      cursor: onClick ? 'pointer' : undefined,
      ...style,
    }}
  >
    {children}
  </div>
);

/* ─── KpiCard ────────────────────────────────────────────────────────────────── */
interface KpiCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  subColor?: string;
  valueColor?: string;
  /** Opsional: tampilkan trend badge ('+12.4%') */
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
}

export const KpiCard = ({
  label,
  value,
  subValue,
  subColor,
  valueColor = 'var(--text-main)',
  trend,
  trendType = 'neutral',
}: KpiCardProps) => (
  <Card>
    {/* Label */}
    <div style={{
      fontSize: '11px',
      color: 'var(--text-subtle)',
      marginBottom: '10px',
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      fontWeight: '500',
    }}>
      {label}
    </div>

    {/* Value + optional trend */}
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
      <div style={{
        fontSize: '22px',
        fontWeight: '600',
        color: valueColor,
        letterSpacing: '-0.5px',
        lineHeight: 1.2,
      }}>
        {value}
      </div>
      {trend && (
        <span className={`badge-${trendType}`}>
          {trend}
        </span>
      )}
    </div>

    {/* Sub value */}
    {subValue && (
      <div style={{
        fontSize: '12px',
        color: subColor ?? 'var(--text-muted)',
        marginTop: '6px',
        fontWeight: '400',
      }}>
        {subValue}
      </div>
    )}
  </Card>
);

/* ─── ProgressCard ───────────────────────────────────────────────────────────── */
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

export const ProgressCard = ({
  label,
  current,
  target,
  progress,
  color = 'var(--accent-primary)',
  footerLeft,
  footerRight,
}: ProgressCardProps) => {
  const clamped = Math.min(Math.max(progress, 0), 100);

  return (
    <Card>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px',
        gap: '8px',
      }}>
        <span style={{
          fontSize: '13px',
          color: 'var(--text-main)',
          fontWeight: '500',
          lineHeight: 1.4,
        }}>
          {label}
        </span>
        <span style={{
          fontSize: '11px',
          color: 'var(--text-subtle)',
          fontWeight: '400',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {fmt(current)} / {fmt(target)}
        </span>
      </div>

      {/* Progress bar — lebih tipis, lebih subtle */}
      <div style={{
        height: '4px',
        background: 'var(--border-color)',
        borderRadius: '99px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          borderRadius: '99px',
          width: `${clamped}%`,
          background: color,
          transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }} />
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '10px',
      }}>
        <span style={{ fontSize: '11px', color: 'var(--text-subtle)', fontWeight: '400' }}>
          {footerLeft}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: color, fontWeight: '500' }}>
            {clamped}% terpenuhi
          </span>
          {footerRight}
        </div>
      </div>
    </Card>
  );
};

/* ─── EmptyState ─────────────────────────────────────────────────────────────── */
export const EmptyState = ({
  message = 'Belum ada data.',
  icon = '○',
}: {
  message?: string;
  icon?: string;
}) => (
  <div style={{
    padding: '48px 24px',
    textAlign: 'center',
    background: 'var(--card-bg)',
    border: '1px dashed var(--border-color-md)',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  }}>
    <div style={{
      fontSize: '20px',
      color: 'var(--text-subtle)',
      marginBottom: '4px',
    }}>
      {icon}
    </div>
    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '400' }}>
      {message}
    </div>
  </div>
);

/* ─── SectionHeader ──────────────────────────────────────────────────────────── */
// Komponen baru — header section yang konsisten di seluruh dashboard
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const SectionHeader = ({ title, subtitle, action }: SectionHeaderProps) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '16px',
    gap: '12px',
  }}>
    <div>
      <h2 style={{
        fontSize: '14px',
        fontWeight: '500',
        color: 'var(--text-main)',
        letterSpacing: '-0.1px',
      }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
          {subtitle}
        </p>
      )}
    </div>
    {action && (
      <div style={{ flexShrink: 0 }}>{action}</div>
    )}
  </div>
);

/* ─── DividerLine ────────────────────────────────────────────────────────────── */
// Komponen baru — pemisah section yang sangat subtle
export const DividerLine = ({ margin = '24px 0' }: { margin?: string }) => (
  <hr style={{
    border: 'none',
    borderTop: '1px solid var(--border-color)',
    margin,
  }} />
);

/* ─── StatRow ────────────────────────────────────────────────────────────────── */
// Komponen baru — baris label: value dalam card
interface StatRowProps {
  label: string;
  value: string | number;
  valueColor?: string;
  last?: boolean;
}

export const StatRow = ({ label, value, valueColor, last = false }: StatRowProps) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: last ? 'none' : '1px solid var(--border-color)',
  }}>
    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{label}</span>
    <span style={{
      fontSize: '13px',
      fontWeight: '500',
      color: valueColor ?? 'var(--text-main)',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {value}
    </span>
  </div>
);

/* ─── TransactionItem ────────────────────────────────────────────────────────── */
// Komponen baru — baris transaksi standar
interface TransactionItemProps {
  label: string;
  sublabel?: string;
  amount: number;
  type: 'income' | 'expense';
  date?: string;
  icon?: React.ReactNode;
  last?: boolean;
}

export const TransactionItem = ({
  label,
  sublabel,
  amount,
  type,
  date,
  icon,
  last = false,
}: TransactionItemProps) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 0',
    borderBottom: last ? 'none' : '1px solid var(--border-color)',
  }}>
    {/* Icon slot */}
    {icon && (
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: '14px',
      }}>
        {icon}
      </div>
    )}

    {/* Label */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: '13px',
        fontWeight: '500',
        color: 'var(--text-main)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </div>
      {sublabel && (
        <div style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '2px' }}>
          {sublabel}
        </div>
      )}
    </div>

    {/* Amount + date */}
    <div style={{ textAlign: 'right', flexShrink: 0 }}>
      <div style={{
        fontSize: '13px',
        fontWeight: '500',
        color: type === 'income' ? 'var(--color-positive)' : 'var(--color-negative)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {type === 'income' ? '+' : '−'}{fmt(amount)}
      </div>
      {date && (
        <div style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '2px' }}>
          {date}
        </div>
      )}
    </div>
  </div>
);
