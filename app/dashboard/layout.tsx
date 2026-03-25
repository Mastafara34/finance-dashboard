// app/dashboard/layout.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';
import QuickAdd from '@/components/QuickAdd';
import DemoBanner from '@/components/DemoBanner';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 1. Profile fetching with resilience: try ID first, then Email (ilike)
  let { data: profile } = await supabase
    .from('users')
    .select('id, email, display_name, telegram_chat_id, role')
    .or(`id.eq.${user.id},email.ilike.${user.email}`)
    .maybeSingle();

  // 2. Auto-register: If authenticated but no record in `users` table, create one!
  if (!profile && user.email) {
    const { data: newProfile, error: createError } = await supabase
      .from('users')
      .insert([{
        id: user.id,
        email: user.email,
        display_name: user.email.split('@')[0],
        role: 'user'
      }])
      .select('id, email, display_name, telegram_chat_id, role')
      .single();

    if (!createError) {
      profile = newProfile;
    } else {
      console.error('Failed to auto-register user:', createError);
    }
  }

  // Fetch all users for the sidebar selector if owner
  let allUsers: any[] = [];
  if (profile?.role === 'owner') {
    const { data } = await supabase
      .from('users')
      .select('id, display_name')
      .or('email.is.null,email.neq.demo@fintrack.app')
      .order('display_name');
    allUsers = data ?? [];
  }

  // Theme logic (Standalone Client Script)
  const themeInitScript = `
    (function() {
      try {
        const theme = localStorage.getItem('app-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
      } catch (e) {}
    })()
  `;

  // Jika profile tidak ditemukan tapi user ada, ini anomali (mungkin row belum dibuat)
  // Untuk mencegah loop redirect, kita tampilkan pesan error atau fallback
  if (!profile) {
    return (
      <div style={{ 
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', 
        background: '#0a0a0f', color: '#f0f0f5', flexDirection: 'column', gap: '16px', padding: '24px', textAlign: 'center' 
      }}>
        <div style={{ fontSize: '48px' }}>👤</div>
        <h2 style={{ margin: 0 }}>Profil Tidak Ditemukan</h2>
        <p style={{ color: '#6b7280', fontSize: '14px', maxWidth: '400px' }}>
          Akun <strong>{user.email}</strong> belum terdaftar atau belum memiliki profil di database Supabase kami.
        </p>
        <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '-8px' }}>UID: {user.id}</p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <a href="/login" style={{ padding: '8px 16px', background: '#1f1f2e', borderRadius: '8px', color: '#f0f0f5', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>Ke Login</a>
          <a href="https://t.me/your_bot" style={{ padding: '8px 16px', background: '#2563eb', borderRadius: '8px', color: '#fff', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>Hubungi Admin</a>
        </div>
      </div>
    );
  }

  // Fetch kategori untuk QuickAdd
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon, type')
    .or(`user_id.eq.${profile.id},user_id.is.null`)
    .order('type', { ascending: true })
    .order('sort_order', { ascending: true });

  return (
    <div>
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      <style>{`
        .fintrack-layout {
          display: flex;
          min-height: 100vh;
          background: var(--bg-secondary);
          color: var(--text-main);
          transition: background 0.3s, color 0.3s;
        }
        .fintrack-content {
          margin-left: 240px;
          padding: 32px;
          flex: 1;
          min-width: 0;
        }
        @media (max-width: 768px) {
          .fintrack-content {
            margin-left: 0;
            padding: 16px;
            padding-bottom: calc(60px + env(safe-area-inset-bottom) + 16px);
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .fintrack-content { padding: 24px; }
        }

        /* Overview Specific Utility Classes */
        .ov-grid6 {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .ov-grid2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-bottom: 24px;
        }
        .ov-section-title {
          font-size: 14px;
          font-weight: 800;
          color: var(--text-muted);
          margin: 32px 0 16px 0;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .ov-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 20px;
          box-shadow: var(--card-shadow);
        }

        @media (max-width: 1200px) {
          .ov-grid6 { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 768px) {
          .ov-grid6 { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .ov-grid2 { grid-template-columns: 1fr; gap: 16px; }
        }
      `}</style>

      <div className="fintrack-layout">
        <DashboardSidebar
          currentUserId={profile.id}
          userRole={profile.role || 'user'}
          allUsers={allUsers}
          userName={profile?.display_name ?? user.email ?? 'User'}
          userEmail={user.email ?? ''}
          hasTelegram={!!profile?.telegram_chat_id}
        />

        <main className="fintrack-content">
          <DemoBanner email={user.email ?? null} />
          <MobileHeader />
          {children}
        </main>

        <BottomNav />
      </div>

      {/* QuickAdd FAB — tampil di semua halaman dashboard */}
      <QuickAdd
        userId={profile.id}
        categories={(categories ?? []) as any[]}
      />
    </div>
  );
}
