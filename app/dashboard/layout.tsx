// app/dashboard/layout.tsx
// Layout untuk semua halaman dashboard — sidebar + auth guard
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardSidebar from '@/components/DashboardSidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Ambil display name dari tabel users
  const { data: profile } = await supabase
    .from('users')
    .select('display_name, telegram_chat_id')
    .eq('email', user.email!)
    .maybeSingle();

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: '#0a0a0f',
      fontFamily: '"DM Sans", system-ui, sans-serif',
    }}>
      <DashboardSidebar
        userName={profile?.display_name ?? user.email ?? 'User'}
        userEmail={user.email ?? ''}
        hasTelegram={!!profile?.telegram_chat_id}
      />

      {/* Main content */}
      <main style={{
        flex: 1,
        marginLeft: '240px',
        padding: '32px',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}>
        {children}
      </main>
    </div>
  );
}
