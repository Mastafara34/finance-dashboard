// components/DashboardSidebar.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const NAV = [
  { href: '/dashboard',              icon: '◉', label: 'Overview'   },
  { href: '/dashboard/transactions', icon: '↕', label: 'Transaksi'  },
  { href: '/dashboard/goals',        icon: '◎', label: 'Goals'      },
  { href: '/dashboard/analytics',    icon: '▦', label: 'Analitik'   },
  { href: '/dashboard/networth',     icon: '◈', label: 'Net Worth'  },
  { href: '/dashboard/budgets',      icon: '▣', label: 'Budget'     },
  { href: '/dashboard/settings',     icon: '◌', label: 'Pengaturan' },
];

interface Props {
  userName: string;
  userEmail: string;
  hasTelegram: boolean;
}

export default function DashboardSidebar({ userName, userEmail, hasTelegram }: Props) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

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
          background: #111118;
          border-right: 1px solid #1f1f2e;
          display: flex;
          flex-direction: column;
          padding: 24px 0;
          z-index: 50;
          overflow-y: auto;
        }
        @media (max-width: 768px) {
          .fintrack-sidebar { display: none !important; }
        }
      `}</style>

      <aside className="fintrack-sidebar">
        {/* Logo */}
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #1f1f2e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', flexShrink: 0,
            }}>💰</div>
            <div>
              <div style={{ color: '#f0f0f5', fontSize: '14px', fontWeight: '600' }}>FinTrack AI</div>
              <div style={{ color: '#374151', fontSize: '11px' }}>Personal Finance</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {NAV.map(item => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <a key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
                textDecoration: 'none', transition: 'all .15s',
                background: isActive ? '#1f1f2e' : 'transparent',
                color: isActive ? '#f0f0f5' : '#6b7280',
              }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget).style.background = '#16161f'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget).style.background = 'transparent'; }}
              >
                <span style={{
                  fontSize: '14px', width: '18px', textAlign: 'center', flexShrink: 0,
                  color: isActive ? '#2563eb' : '#4b5563',
                }}>{item.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: isActive ? '500' : '400' }}>
                  {item.label}
                </span>
                {isActive && (
                  <span style={{
                    marginLeft: 'auto', width: '4px', height: '4px',
                    borderRadius: '99px', background: '#2563eb', flexShrink: 0,
                  }} />
                )}
              </a>
            );
          })}
        </nav>

        {/* Telegram warning */}
        {!hasTelegram && (
          <div style={{
            margin: '0 12px 12px', padding: '10px 12px',
            background: '#1a1000', border: '1px solid #3d2a00', borderRadius: '8px',
          }}>
            <div style={{ color: '#f59e0b', fontSize: '12px', fontWeight: '500', marginBottom: '2px' }}>
              Bot belum terhubung
            </div>
            <div style={{ color: '#6b5a2a', fontSize: '11px' }}>
              Hubungkan Telegram untuk input otomatis
            </div>
          </div>
        )}

        {/* User + logout */}
        <div style={{ padding: '16px 20px 0', borderTop: '1px solid #1f1f2e' }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#f0f0f5', fontSize: '13px', fontWeight: '500' }}>{userName}</div>
            <div style={{ color: '#374151', fontSize: '11px', marginTop: '2px' }}>{userEmail}</div>
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '8px',
            background: 'transparent', border: '1px solid #1f1f2e',
            borderRadius: '7px', color: '#6b7280', fontSize: '12px',
            cursor: 'pointer', transition: 'all .15s',
          }}
            onMouseEnter={e => { (e.currentTarget).style.borderColor = '#3d1515'; (e.currentTarget).style.color = '#f87171'; }}
            onMouseLeave={e => { (e.currentTarget).style.borderColor = '#1f1f2e'; (e.currentTarget).style.color = '#6b7280'; }}
          >Keluar</button>
        </div>
      </aside>
    </>
  );
}
