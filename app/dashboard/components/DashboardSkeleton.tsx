// app/dashboard/components/DashboardSkeleton.tsx
import React from 'react';

const Skeleton = ({ width, height, borderRadius = '8px', marginBottom = '0px' }: { width: string, height: string, borderRadius?: string, marginBottom?: string }) => (
  <div style={{
    width,
    height,
    borderRadius,
    marginBottom,
    background: 'linear-gradient(90deg, #111118 25%, #1a1a25 50%, #111118 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite linear',
  }} />
);

export default function DashboardSkeleton() {
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
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
          <div key={i} style={{ background: '#111118', padding: '20px', borderRadius: '16px', border: '1px solid #1f1f2e' }}>
            <Skeleton width="100px" height="14px" marginBottom="12px" />
            <Skeleton width="180px" height="28px" marginBottom="8px" />
            <Skeleton width="60px" height="12px" />
          </div>
        ))}
      </div>

      {/* Charts / Main Content Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div style={{ background: '#111118', padding: '24px', borderRadius: '16px', border: '1px solid #1f1f2e', height: '400px' }}>
          <Skeleton width="200px" height="20px" marginBottom="24px" />
          <Skeleton width="100%" height="300px" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#111118', padding: '24px', borderRadius: '16px', border: '1px solid #1f1f2e', height: '190px' }}>
            <Skeleton width="150px" height="18px" marginBottom="16px" />
            <Skeleton width="100%" height="100px" />
          </div>
          <div style={{ background: '#111118', padding: '24px', borderRadius: '16px', border: '1px solid #1f1f2e', height: '190px' }}>
            <Skeleton width="150px" height="18px" marginBottom="16px" />
            <Skeleton width="100%" height="100px" />
          </div>
        </div>
      </div>
    </div>
  );
}
