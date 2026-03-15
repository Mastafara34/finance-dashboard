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
      {/* Spacer agar konten tidak tertutup bottom nav */}
      <div className="show-mobile" style={{ height: '64px', flexShrink: 0 }} />

      <nav style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: 'calc(64px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: '#111118',
        borderTop: '1px solid #1f1f2e',
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 100,
      }}
        className="show-mobile-flex"
      >
        {NAV.map(item => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          // "Lainnya" juga aktif untuk halaman yang tidak di NAV utama
          const isLainnya = item.href === '/dashboard/settings' &&
            !NAV.slice(0, -1).some(n => pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href)));

          const active = isActive || isLainnya;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                textDecoration: 'none',
                color: active ? '#2563eb' : '#6b7280',
                transition: 'color .15s',
                paddingTop: '8px',
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>{item.icon}</span>
              <span style={{
                fontSize: '10px',
                fontWeight: active ? '600' : '400',
                letterSpacing: '.01em',
              }}>
                {item.label}
              </span>
              {active && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  width: '24px',
                  height: '2px',
                  borderRadius: '0 0 2px 2px',
                  background: '#2563eb',
                }} />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
