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
    .select('id, display_name, telegram_chat_id')
    .eq('email', user.email!)
    .maybeSingle();

  if (!profile) redirect('/login');

  // Fetch kategori untuk QuickAdd
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon, type')
    .or(`user_id.eq.${profile.id},user_id.is.null`)
    .order('type', { ascending: true })
    .order('sort_order', { ascending: true });

  return (
    <>
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
          .fintrack-content { padding: 24px; }
        }
      `}</style>

      <div className="fintrack-layout">
        <DashboardSidebar
          userName={profile?.display_name ?? user.email ?? 'User'}
          userEmail={user.email ?? ''}
          hasTelegram={!!profile?.telegram_chat_id}
        />

        <DemoBanner email={user.email ?? null} />

        <main className="fintrack-content">
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
    </>
  );
}
