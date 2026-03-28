// components/BottomNav.tsx
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ArrowUpDown,
  Target,
  BarChart3,
  GraduationCap,
  Settings
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Overview' },
  { href: '/dashboard/transactions', icon: <ArrowUpDown size={20} />, label: 'Transaksi' },
  { href: '/dashboard/goals', icon: <Target size={20} />, label: 'Goals' },
  { href: '/dashboard/analytics', icon: <BarChart3 size={20} />, label: 'Analitik' },
  { href: '/dashboard/academy', icon: <GraduationCap size={20} />, label: 'Akademi' },
  { href: '/dashboard/settings', icon: <Settings size={20} />, label: 'Lainnya' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const uParam = searchParams.get('u');

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
            background: var(--card-bg);
            border-top: 1px solid var(--border-color);
            align-items: stretch;
            z-index: 100;
            transition: background-color 0.3s ease, border-color 0.3s ease;
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
          const href = uParam ? `${item.href}?u=${uParam}` : item.href;

          return (
            <Link key={item.href} href={href} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              textDecoration: 'none',
              color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
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
                  background: 'var(--accent-primary)',
                }} />
              )}
              <span style={{ height: '20px', display: 'flex', alignItems: 'center' }}>{item.icon}</span>
              <span style={{
                fontSize: '12px',
                fontWeight: active ? '500' : '400',
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
