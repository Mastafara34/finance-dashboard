// components/DemoBanner.tsx
'use client';

interface Props { email: string | null }

export default function DemoBanner({ email }: Props) {
  if (email !== 'demo@fintrack.app') return null;

  return (
    <div style={{
      background: '#1a1000',
      border: '1px solid #3d2a00',
      borderRadius: '10px',
      padding: '10px 16px',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px', flexWrap: 'wrap',
      marginBottom: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px' }}>🎭</span>
        <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: '500' }}>
          Kamu sedang melihat <strong>Akun Demo</strong> — data simulasi, direset setiap hari
        </span>
      </div>
      <a href="/login" style={{
        fontSize: '12px', color: '#f59e0b', fontWeight: '600',
        textDecoration: 'none', padding: '4px 12px',
        border: '1px solid #854d0e', borderRadius: '6px',
        whiteSpace: 'nowrap',
      }}>
        Daftar Akun Sendiri →
      </a>
    </div>
  );
}


