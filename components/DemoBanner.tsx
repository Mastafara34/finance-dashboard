// components/DemoBanner.tsx
// Banner kuning yang muncul kalau sedang login sebagai demo account
'use client';

interface Props { email: string | null }

export default function DemoBanner({ email }: Props) {
  if (email !== 'demo@fintrack.app') return null;

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 60,
      background: '#1a1000', borderBottom: '1px solid #3d2a00',
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '12px', flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '16px' }}>🎭</span>
        <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: '500' }}>
          Kamu sedang melihat <strong>Akun Demo</strong> — data bersifat simulasi dan direset setiap hari
        </span>
      </div>
      <a href="/login" style={{
        fontSize: '12px', color: '#f59e0b', fontWeight: '600',
        textDecoration: 'none', padding: '5px 12px',
        border: '1px solid #854d0e', borderRadius: '6px',
        whiteSpace: 'nowrap',
      }}>
        Daftar Akun Sendiri →
      </a>
    </div>
  );
}
