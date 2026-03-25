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

  const { data: profile } = await supabase
    .from('users')
    .select('id, display_name, telegram_chat_id, role')
    .eq('id', user.id)
    .maybeSingle();

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
        background: '#0a0a0f', color: '#f0f0f5', flexDirection: 'column', gap: '16px' 
      }}>
        <div style={{ fontSize: '40px' }}>⚠️</div>
        <h2 style={{ margin: 0 }}>Profil Tidak Ditemukan</h2>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Akun anda belum terdaftar di database kami.</p>
        <a href="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>Kembali ke Login</a>
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
