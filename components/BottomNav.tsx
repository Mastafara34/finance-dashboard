// components/BottomNav.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV = [
  { href: '/dashboard',              icon: '◉', label: 'Overview'  },
  { href: '/dashboard/transactions', icon: '↕', label: 'Transaksi' },
  { href: '/dashboard/goals',        icon: '◎', label: 'Goals'     },
  { href: '/dashboard/analytics',    icon: '▦', label: 'Analitik'  },
  { href: '/dashboard/settings',     icon: '◌', label: 'Lainnya'   },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <style>{`
        .fintrack-bottom-nav {
          display: none;
        }
        @media (max-width: 768px) {
          .fintrack-bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            height: calc(60px + env(safe-area-inset-bottom));
            padding-bottom: env(safe-area-inset-bottom);
            background: #111118;
            border-top: 1px solid #1f1f2e;
            align-items: stretch;
            z-index: 100;
          }
          .fintrack-bottom-spacer {
            display: block;
            height: calc(60px + env(safe-area-inset-bottom));
            flex-shrink: 0;
          }
        }
      `}</style>

      {/* Spacer agar konten tidak ketutupan nav */}
      <div className="fintrack-bottom-spacer" />

      <nav className="fintrack-bottom-nav">
        {NAV.map(item => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          // "Lainnya" aktif untuk halaman yang tidak ada di nav utama
          const isLainnya = item.label === 'Lainnya' &&
            !NAV.slice(0, -1).some(n =>
              pathname === n.href ||
              (n.href !== '/dashboard' && pathname.startsWith(n.href))
            );

          const active = isActive || isLainnya;

          return (
            <Link key={item.href} href={item.href} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              textDecoration: 'none',
              color: active ? '#2563eb' : '#6b7280',
              transition: 'color .15s',
              paddingTop: '6px',
              position: 'relative',
            }}>
              {/* Active indicator top bar */}
              {active && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: '20px', height: '2px',
                  borderRadius: '0 0 2px 2px',
                  background: '#2563eb',
                }} />
              )}
              <span style={{ fontSize: '20px', lineHeight: 1 }}>{item.icon}</span>
              <span style={{
                fontSize: '10px',
                fontWeight: active ? '600' : '400',
                letterSpacing: '.01em',
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
