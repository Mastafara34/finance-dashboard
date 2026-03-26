// components/MobileHeader.tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { UserSelector } from '@/app/dashboard/components/UserSelector';

interface Props {
  allUsers: { id: string; display_name: string | null }[];
  currentUserId: string;
  userRole: string;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':              'Overview',
  '/dashboard/transactions': 'Transaksi',
  '/dashboard/goals':        'Goals',
  '/dashboard/analytics':    'Analitik',
  '/dashboard/networth':     'Net Worth',
  '/dashboard/budgets':      'Budget',
  '/dashboard/settings':     'Pengaturan',
};

export default function MobileHeader({ allUsers, currentUserId, userRole }: Props) {
  const pathname = usePathname();
  const router   = useRouter();
  const searchParams = useSearchParams();

  const isOwner = userRole === 'owner';
  const uParam = searchParams.get('u');
  const viewUserId = (isOwner && uParam && uParam !== 'all') ? uParam : currentUserId;
  const isCollective = isOwner && uParam === 'all';

  // Cari title — exact match dulu, lalu prefix match
  const title = PAGE_TITLES[pathname] ??
    Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ??
    'FinTrack AI';

  const isRoot = pathname === '/dashboard';

  return (
    <>
      <style>{`
        .fintrack-mobile-header {
          display: none;
        }
        @media (max-width: 768px) {
          .fintrack-mobile-header {
            display: flex;
            align-items: center;
            padding: 0 16px;
            height: 56px;
            background: var(--card-bg);
            border-bottom: 1px solid var(--border-color);
            position: sticky;
            top: 0;
            z-index: 40;
            margin: -16px -16px 16px;
            gap: 12px;
            transition: background 0.3s, border-color 0.3s;
          }
        }
      `}</style>

      <div className="fintrack-mobile-header">
        {/* Back button — hanya tampil kalau bukan root dashboard */}
        {!isRoot && (
          <button
            onClick={() => router.back()}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: '20px',
              cursor: 'pointer', padding: '4px 8px 4px 0',
              display: 'flex', alignItems: 'center',
              flexShrink: 0,
            }}
          >
            ←
          </button>
        )}

        {/* Logo di root, title di halaman lain */}
        {isRoot ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '7px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', flexShrink: 0,
            }}>💰</div>
            <span style={{ color: 'var(--text-main)', fontSize: '16px', fontWeight: '600' }}>
              FinTrack AI
            </span>
          </div>
        ) : (
          <span style={{
            color: 'var(--text-main)', fontSize: '16px', fontWeight: '600', flex: 1,
          }}>
            {title}
          </span>
        )}

        {/* Global User Selector (Mobile) — only for owner */}
        {isOwner && (
          <div style={{ width: '150px', flexShrink: 0 }}>
            <UserSelector 
              users={allUsers} 
              currentViewId={viewUserId} 
              isCollective={isCollective} 
              showCollective={true} 
            />
          </div>
        )}
      </div>
    </>
  );
}
