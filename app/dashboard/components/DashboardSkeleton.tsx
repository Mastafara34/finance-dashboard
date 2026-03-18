// app/dashboard/components/DashboardSkeleton.tsx
import React from 'react';

const Skeleton = ({ width, height, borderRadius = '8px', marginBottom = '0px' }: { width: string, height: string, borderRadius?: string, marginBottom?: string }) => (
  <div style={{
    width,
    height,
    borderRadius,
    marginBottom,
    background: 'linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-highlight) 50%, var(--skeleton-base) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite linear',
  }} />
);

export default function DashboardSkeleton() {
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-main)' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
      
      {/* Header Skeleton */}
      <div style={{ marginBottom: '32px' }}>
        <Skeleton width="150px" height="24px" marginBottom="8px" />
        <Skeleton width="250px" height="16px" />
      </div>

      {/* KPI Cards Skeleton */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '20px',
        marginBottom: '32px' 
      }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
            <Skeleton width="100px" height="14px" marginBottom="12px" />
            <Skeleton width="180px" height="28px" marginBottom="8px" />
            <Skeleton width="60px" height="12px" />
          </div>
        ))}
      </div>

      {/* Charts / Main Content Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', height: '400px', boxShadow: 'var(--card-shadow)' }}>
          <Skeleton width="200px" height="20px" marginBottom="24px" />
          <Skeleton width="100%" height="300px" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', height: '190px', boxShadow: 'var(--card-shadow)' }}>
            <Skeleton width="150px" height="18px" marginBottom="16px" />
            <Skeleton width="100%" height="100px" />
          </div>
          <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', height: '190px', boxShadow: 'var(--card-shadow)' }}>
            <Skeleton width="150px" height="18px" marginBottom="16px" />
            <Skeleton width="100%" height="100px" />
          </div>
        </div>
      </div>
    </div>
  );
}
