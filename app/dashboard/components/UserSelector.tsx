'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const familyUsers = users.filter(u => u.email !== DEMO_EMAIL);
  const demoUsers   = users.filter(u => u.email === DEMO_EMAIL);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '4px',
      opacity: isNavigating ? 0.7 : 1,
      pointerEvents: isNavigating ? 'none' : 'auto',
      transition: 'all 0.2s ease',
      position: 'relative',
    }}>
      <Select 
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
      >
        <SelectTrigger style={{ 
          width: '100%', 
          background: 'var(--bg-secondary)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '8px', 
          color: 'var(--text-main)', 
          fontSize: '13px', 
          fontWeight: '600',
          height: '38px'
        }}>
          <SelectValue placeholder="Pilih User" />
        </SelectTrigger>
        <SelectContent style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
          {showCollective && (
            <SelectItem value="all">🏠 Seluruh Keluarga</SelectItem>
          )}

          {familyUsers.length > 0 && (
            <SelectGroup>
              <SelectLabel style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>AKUN KELUARGA</SelectLabel>
              {familyUsers.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  👤 {u.display_name ?? 'Member'}
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {demoUsers.length > 0 && (
            <SelectGroup>
              <SelectLabel style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>DEMO</SelectLabel>
              {demoUsers.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  🎭 {u.display_name ?? 'Demo'}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      {isNavigating && (
        <div style={{ position: 'absolute', right: '35px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', animation: 'pulse 1s infinite' }}>Loading...</span>
        </div>
      )}
    </div>
  );
}
