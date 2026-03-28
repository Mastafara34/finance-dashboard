// components/DashboardSidebar.tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserSelector } from '@/app/dashboard/components/UserSelector';
import Link from 'next/link';
import {
  LayoutDashboard, ArrowUpDown, Target, BarChart3,
  TrendingUp, Wallet, GraduationCap, Settings
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/transactions', icon: ArrowUpDown, label: 'Transaksi' },
  { href: '/dashboard/goals', icon: Target, label: 'Goals' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Laporan & Analitik' },
  { href: '/dashboard/networth', icon: TrendingUp, label: 'Net Worth' },
  { href: '/dashboard/budgets', icon: Wallet, label: 'Budget' },
  { href: '/dashboard/academy', icon: GraduationCap, label: 'Akademi / Tips' },
];

interface Props {
  userName: string;
  userEmail: string;
  hasTelegram: boolean;
  currentUserId: string;
  userRole: string;
  allUsers: { id: string; display_name: string | null }[];
}

export default function DashboardSidebar({ userName, userEmail, hasTelegram, currentUserId, userRole, allUsers }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const isOwner = userRole === 'owner';
  const uParam = searchParams.get('u');
  const viewUserId = (isOwner && uParam && uParam !== 'all') ? uParam : currentUserId;
  const isCollective = isOwner && uParam === 'all';

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      {/* ── CSS untuk hide/show via media query ── */}
      <style>{`
        .fintrack-sidebar {
          position: fixed;
          top: 0; left: 0;
          width: 240px;
          height: 100vh;
          background: var(--card-bg);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          padding: 24px 0;
          z-index: 50;
          overflow-y: auto;
          transition: background 0.3s, border-color 0.3s;
        }
        @media (max-width: 768px) {
          .fintrack-sidebar { display: none !important; }
        }
      `}</style>

      <aside className="fintrack-sidebar">
        {/* Logo */}
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'var(--border-color-strong)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', flexShrink: 0,
            }}>💰</div>
            <div>
              <div style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: '600' }}>FinTrack AI</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Personal Finance</div>
            </div>
          </div>
        </div>

        {/* User Selector for Owner */}
        {isOwner && (
          <div style={{ padding: '0 12px 16px', borderBottom: '1px solid var(--border-color)', marginTop: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: '500', color: 'var(--text-subtle)', marginBottom: '8px', paddingLeft: '8px' }}>Pilih Tampilan</div>
            <UserSelector
              users={allUsers}
              currentViewId={viewUserId}
              isCollective={isCollective}
              showCollective={true}
            />
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {NAV.map(item => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            // Fix: Pertahankan parameter 'u' saat navigasi antar tab
            const href = uParam ? `${item.href}?u=${uParam}` : item.href;

            return (
              <Link key={item.href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: 'var(--radius-md)', marginBottom: '2px',
                textDecoration: 'none', transition: 'all .15s',
                background: isActive ? 'var(--border-color)' : 'transparent',
                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
              }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as any).style.background = 'var(--bg-primary)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as any).style.background = 'transparent'; }}
              >
                <item.icon
                  size={16}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={{ flexShrink: 0, color: isActive ? 'var(--text-main)' : 'var(--text-muted)' }}
                />
                <span style={{ fontSize: '13px', fontWeight: isActive ? '600' : '400' }}>
                  {item.label}
                </span>
                {isActive && (
                  <span style={{
                    marginLeft: 'auto', width: '4px', height: '4px',
                    borderRadius: '99px', background: 'var(--text-main)', flexShrink: 0,
                  }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Telegram warning */}
        {!hasTelegram && (
          <div style={{
            margin: '0 12px 12px', padding: '10px 12px',
            background: 'var(--color-neutral-bg)', border: '1px solid var(--color-neutral)', borderRadius: 'var(--radius-md)',
          }}>
            <div style={{ color: 'var(--color-neutral)', fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
              Bot Belum Terhubung
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
              Hubungkan Telegram untuk input otomatis
            </div>
          </div>
        )}

        {/* Bottom Section: Settings Only */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
          {/* Linked Settings Item */}
          <Link href={uParam ? `/dashboard/settings?u=${uParam}` : '/dashboard/settings'} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '9px 12px', borderRadius: 'var(--radius-md)',
            textDecoration: 'none', transition: 'all .15s',
            background: pathname.startsWith('/dashboard/settings') ? 'var(--border-color)' : 'transparent',
            color: pathname.startsWith('/dashboard/settings') ? 'var(--text-main)' : 'var(--text-muted)',
          }}
            onMouseEnter={e => { if (!pathname.startsWith('/dashboard/settings')) (e.currentTarget as any).style.background = 'var(--bg-primary)'; }}
            onMouseLeave={e => { if (!pathname.startsWith('/dashboard/settings')) (e.currentTarget as any).style.background = 'transparent'; }}
          >
            <Settings
              size={16}
              strokeWidth={pathname.startsWith('/dashboard/settings') ? 2.5 : 1.8}
              style={{ flexShrink: 0, color: pathname.startsWith('/dashboard/settings') ? 'var(--text-main)' : 'var(--text-muted)' }}
            />
            <span style={{ fontSize: '13px', fontWeight: pathname.startsWith('/dashboard/settings') ? '600' : '400' }}>
              Pengaturan
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}
