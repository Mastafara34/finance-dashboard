// components/DashboardSidebar.tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserSelector } from '@/app/dashboard/components/UserSelector';
import Link from 'next/link';
import {
  LayoutDashboard, ArrowUpDown, Target, BarChart3,
  TrendingUp, Wallet, GraduationCap, Settings, LogOut
} from 'lucide-react';

const NAV = [
  { href: '/dashboard',              icon: LayoutDashboard, label: 'Overview'            },
  { href: '/dashboard/transactions', icon: ArrowUpDown,     label: 'Transaksi'           },
  { href: '/dashboard/goals',        icon: Target,          label: 'Goals'               },
  { href: '/dashboard/analytics',    icon: BarChart3,       label: 'Laporan & Analitik'  },
  { href: '/dashboard/networth',     icon: TrendingUp,      label: 'Net Worth'           },
  { href: '/dashboard/budgets',      icon: Wallet,          label: 'Budget'              },
  { href: '/dashboard/academy',      icon: GraduationCap,   label: 'Akademi / Tips'      },
  { href: '/dashboard/settings',     icon: Settings,        label: 'Pengaturan'          },
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
  const router   = useRouter();
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
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
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
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', paddingLeft: '8px' }}>PILIH TAMPILAN</div>
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
                padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
                textDecoration: 'none', transition: 'all .15s',
                background: isActive ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as any).style.background = 'var(--bg-primary)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as any).style.background = 'transparent'; }}
              >
                <item.icon
                  size={16}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={{ flexShrink: 0, color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                />
                <span style={{ fontSize: '13px', fontWeight: isActive ? '600' : '400' }}>
                  {item.label}
                </span>
                {isActive && (
                  <span style={{
                    marginLeft: 'auto', width: '4px', height: '4px',
                    borderRadius: '99px', background: 'var(--accent-primary)', flexShrink: 0,
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
            background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px',
          }}>
            <div style={{ color: '#f59e0b', fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
              Bot belum terhubung
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
              Hubungkan Telegram untuk input otomatis
            </div>
          </div>
        )}

        {/* User + logout */}
        <div style={{ padding: '16px 20px 0', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '600' }}>{userName}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{userEmail}</div>
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '8px',
            background: 'transparent', border: '1px solid var(--border-color)',
            borderRadius: '7px', color: 'var(--text-muted)', fontSize: '12px',
            cursor: 'pointer', transition: 'all .15s',
          }}
            onMouseEnter={e => { (e.currentTarget).style.borderColor = '#ef4444'; (e.currentTarget).style.color = '#ef4444'; (e.currentTarget).style.background = 'rgba(239, 68, 68, 0.05)'; }}
            onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--border-color)'; (e.currentTarget).style.color = 'var(--text-muted)'; (e.currentTarget).style.background = 'transparent'; }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <LogOut size={13} strokeWidth={2} />
              Keluar
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
