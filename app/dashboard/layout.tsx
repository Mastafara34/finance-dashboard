// app/dashboard/layout.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardSidebar from '@/components/DashboardSidebar';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';

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
    <>
      {/* Responsive layout CSS */}
      <style>{`
        .fintrack-layout {
          display: flex;
          min-height: 100vh;
          background: #0a0a0f;
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
          .fintrack-content {
            padding: 24px;
          }
        }
      `}</style>

      <div className="fintrack-layout">
        {/* Sidebar — hidden on mobile via CSS in component */}
        <DashboardSidebar
          userName={profile?.display_name ?? user.email ?? 'User'}
          userEmail={user.email ?? ''}
          hasTelegram={!!profile?.telegram_chat_id}
        />

        {/* Main content */}
        <main className="fintrack-content">
          {/* Header mobile — hanya tampil di HP */}
          <MobileHeader />
          {children}
        </main>

        {/* Bottom nav — hanya tampil di HP via CSS in component */}
        <BottomNav />
      </div>
    </>
  );
}
