'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface Props {
  users: { id: string; display_name: string | null }[];
  currentViewId: string;
  isCollective?: boolean;
  showCollective?: boolean;
}

export function UserSelector({ users, currentViewId, isCollective = false, showCollective = true }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isNavigating, setIsNavigating] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setIsNavigating(true);
    const params = new URLSearchParams(searchParams.toString());
    if (val === 'all') {
      params.set('u', 'all');
    } else {
      params.set('u', val);
    }
    // Hard refresh to ensure data is fetched fresh
    window.location.href = `${pathname}?${params.toString()}`;
  }

  const activeVal = isCollective ? 'all' : currentViewId;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      marginBottom: '20px',
      padding: '10px 14px',
      background: isNavigating ? 'var(--bg-secondary, #0a0a0f)' : 'var(--card-bg, #111118)',
      border: `1px solid ${isNavigating ? 'var(--border-color, #2a2a3a)' : 'var(--border-color, #1f1f2e)'}`,
      borderRadius: '10px',
      opacity: isNavigating ? 0.7 : 1,
      pointerEvents: isNavigating ? 'none' : 'auto',
      transition: 'all 0.2s ease',
    }}>
      <span style={{ fontSize: '18px' }}>{isNavigating ? '⏳' : '👁️'}</span>
      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted, #6b7280)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {isNavigating ? 'Sabar bos... (Sedang memuat data)' : 'Tampilkan data:'}
      </span>
      <select
        value={activeVal}
        onChange={handleChange}
        disabled={isNavigating}
        style={{
          background: 'var(--bg-secondary, #0a0a0f)',
          border: '1px solid var(--border-color, #2a2a3a)',
          color: 'var(--text-main, #f0f0f5)',
          padding: '6px 28px 6px 10px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          backgroundSize: '14px',
        }}
      >
        {showCollective && (
          <option value="all">🏠 Semua Akun (Gabungan)</option>
        )}
        {users.map(u => (
          <option key={u.id} value={u.id}>
            👤 {u.display_name ?? 'Tanpa Nama'}
          </option>
        ))}
      </select>

      <span style={{
        marginLeft: 'auto',
        fontSize: '11px',
        color: '#6b7280',
        fontStyle: 'italic',
      }}>
        Ganti akun untuk refresh otomatis
      </span>
    </div>
  );
}
