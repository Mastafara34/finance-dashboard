'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function UserSelector({ 
  users, 
  currentViewId, 
  isCollective 
}: { 
  users: { id: string, display_name: string | null }[], 
  currentViewId: string,
  isCollective: boolean
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val === 'all') {
      params.set('u', 'all');
    } else if (val === 'me') {
      params.delete('u');
    } else {
      params.set('u', val);
    }
    router.push(`?${params.toString()}`);
  }

  const activeVal = isCollective ? 'all' : currentViewId;

  return (
    <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)' }}>VIEWING DATA FOR:</label>
      <select 
        value={activeVal} 
        onChange={handleChange}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-main)',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '14px',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        <option value="all">Keluarga (Total Gabungan)</option>
        {users.map(u => (
          <option key={u.id} value={u.id}>
            {u.display_name}
          </option>
        ))}
      </select>
    </div>
  );
}
