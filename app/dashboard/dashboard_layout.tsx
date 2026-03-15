// app/dashboard/layout.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import BottomNav from '@/components/BottomNav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, telegram_chat_id')
    .eq('email', user.email!)
    .maybeSingle();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f' }}>

      {/* Sidebar — hidden on mobile via CSS */}
      <DashboardSidebar
        userName={profile?.display_name ?? user.email ?? 'User'}
        userEmail={user.email ?? ''}
        hasTelegram={!!profile?.telegram_chat_id}
      />

      {/* Main content */}
      <main className="dashboard-main" style={{ flex: 1 }}>
        {children}
      </main>

      {/* Bottom nav — only on mobile */}
      <BottomNav />
    </div>
  );
}
