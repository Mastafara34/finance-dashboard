// app/dashboard/loading.tsx
import React from 'react';

export default function Loading() {
  return (
    <div style={{ color: 'var(--text-main)', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      
      <style>{`
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .skeleton {
          background: var(--bg-secondary);
          background-image: linear-gradient(
            to right,
            var(--bg-secondary) 0%,
            var(--border-color) 20%,
            var(--bg-secondary) 40%,
            var(--bg-secondary) 100%
          );
          background-repeat: no-repeat;
          background-size: 1000px 100%;
          display: inline-block;
          position: relative;
          animation: shimmer 2.5s infinite linear;
          border-radius: var(--radius-sm);
        }
        .sk-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 24px;
          height: 120px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .ov-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px; }
        .ov-grid6 { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; margin-bottom: 32px; }
        @media (max-width: 900px) {
          .ov-grid6 { grid-template-columns: repeat(2, 1fr); }
          .ov-grid3 { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <div className="skeleton" style={{ width: '200px', height: '28px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '150px', height: '16px' }} />
        </div>
        <div className="skeleton" style={{ width: '120px', height: '50px', borderRadius: '16px' }} />
      </div>

      {/* KPI Grid Skeleton */}
      <div className="ov-grid6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="sk-card">
            <div className="skeleton" style={{ width: '50%', height: '10px', marginBottom: '12px' }} />
            <div className="skeleton" style={{ width: '70%', height: '24px' }} />
          </div>
        ))}
      </div>

      {/* Section Title */}
      <div className="skeleton" style={{ width: '180px', height: '14px', marginBottom: '16px', display: 'block' }} />

      {/* Main Content Grid */}
      <div className="ov-grid3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="sk-card" style={{ height: '200px' }}>
            <div className="skeleton" style={{ width: '40%', height: '12px', marginBottom: '20px' }} />
            <div className="skeleton" style={{ width: '100%', height: '100px', borderRadius: '8px' }} />
          </div>
        ))}
      </div>

      {/* Bottom Chart Table Area */}
      <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
        <div className="sk-card" style={{ height: '300px' }}>
          <div className="skeleton" style={{ width: '30%', height: '12px', marginBottom: '20px' }} />
          <div className="skeleton" style={{ width: '100%', height: '220px', borderRadius: '8px' }} />
        </div>
        <div className="sk-card" style={{ height: '300px' }}>
          <div className="skeleton" style={{ width: '50%', height: '12px', marginBottom: '20px' }} />
          {[...Array(5)].map((_, j) => (
            <div key={j} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div className="skeleton" style={{ width: '40%', height: '10px' }} />
              <div className="skeleton" style={{ width: '20%', height: '10px' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
