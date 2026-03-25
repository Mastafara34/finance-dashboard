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
    const targetUrl = `${pathname}?${params.toString()}`;
    router.push(targetUrl);
    // Remove hard refresh to prevent continuous reloading
  }

  const activeVal = isCollective ? 'all' : currentViewId;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '4px',
      opacity: isNavigating ? 0.7 : 1,
      pointerEvents: isNavigating ? 'none' : 'auto',
      transition: 'all 0.2s ease',
    }}>
      <select
        value={activeVal}
        onChange={handleChange}
        disabled={isNavigating}
        style={{
          width: '100%',
          background: 'var(--bg-secondary, #0a0a0f)',
          border: '1px solid var(--border-color, #2a2a3a)',
          color: isNavigating ? 'var(--text-muted)' : 'var(--text-main, #f0f0f5)',
          padding: '8px 10px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '600',
          cursor: 'pointer',
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          backgroundSize: '12px',
        }}
      >
        {isNavigating ? (
          <option value="">🔄 Loading...</option>
        ) : (
          <>
            {showCollective && (
              <option value="all">🏠 Keluarga (Total)</option>
            )}
            {users.map(u => (
              <option key={u.id} value={u.id}>
                👤 {u.display_name ?? 'Tanpa Nama'}
              </option>
            ))}
          </>
        )}
      </select>
    </div>
  );
}
