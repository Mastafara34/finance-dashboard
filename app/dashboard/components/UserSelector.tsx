'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface User {
  id: string;
  display_name: string | null;
  email?: string | null;
}

interface Props {
  users: User[];
  currentViewId: string;
  isCollective?: boolean;
  showCollective?: boolean;
}

const DEMO_EMAIL = 'demo@fintrack.app';

export function UserSelector({ users, currentViewId, isCollective = false, showCollective = true }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isNavigating, setIsNavigating] = useState(false);

  // Reset loading state when searchParams change (navigation finished)
  useEffect(() => {
    setIsNavigating(false);
  }, [searchParams]);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setIsNavigating(true);
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('u', val);
    
    // Gunakan window.location.href untuk SWITCH KONTEKS. 
    // Mengapa? Karena ini garantee 100% data fresh dari DB & membersihkan 
    // Router Cache Next.js yang kadang bandel menyimpan data user sebelumnya (Agus vs Naninaninju).
    const targetUrl = `${pathname}?${params.toString()}`;
    window.location.href = targetUrl;
  }

  const activeVal = isCollective ? 'all' : currentViewId;

  const options = [];
  if (showCollective) {
    options.push({ value: 'all', label: 'Seluruh Keluarga', icon: '🏠' });
  }

  users
    .filter(u => u.email !== DEMO_EMAIL)
    .forEach(u => {
      options.push({ value: u.id, label: u.display_name ?? 'Member', icon: '👤' });
    });

  users
    .filter(u => u.email === DEMO_EMAIL)
    .forEach(u => {
      options.push({ value: u.id, label: u.display_name ?? 'Demo', icon: '🎭' });
    });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '4px',
      opacity: isNavigating ? 0.7 : 1,
      pointerEvents: isNavigating ? 'none' : 'auto',
      transition: 'all 0.2s ease',
      position: 'relative',
    }}>
      <SearchableSelect
        value={activeVal}
        disabled={isNavigating}
        onValueChange={(val) => {
          if (!val) return;
          setIsNavigating(true);
          const params = new URLSearchParams(searchParams.toString());
          params.set('u', val);
          const targetUrl = `${pathname}?${params.toString()}`;
          window.location.href = targetUrl;
        }}
        options={options}
        placeholder="Pilih User"
        style={{ height: '40px' }}
      />
      {isNavigating && (
        <div style={{ position: 'absolute', right: '35px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 10 }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', animation: 'pulse 1s infinite' }}>Loading...</span>
        </div>
      )}
    </div>
  );
}
