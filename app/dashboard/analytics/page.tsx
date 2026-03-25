// app/dashboard/analytics/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AnalyticsClient from './AnalyticsClient';
import { UserSelector } from '../components/UserSelector';

export default async function AnalyticsPage({ searchParams }: { searchParams: { u?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', user.email!)
    .maybeSingle();

  if (!profile) redirect('/login');

  const isOwner = profile.role === 'owner';
  const viewUserId = (isOwner && searchParams.u && searchParams.u !== 'all')
    ? searchParams.u
    : profile.id;

  let allUsers: any[] = [];
  if (isOwner) {
    const { data } = await supabase
      .from('users')
      .select('id, display_name')
      .neq('email', 'demo@fintrack.app')
      .order('display_name');
    allUsers = data ?? [];
  }

  // Fetch 12 bulan terakhir untuk analisis lengkap
  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  const sinceStr = since.toISOString().split('T')[0];

  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, type, date, categories(name, icon)')
    .eq('user_id', viewUserId)
    .eq('is_deleted', false)
    .gte('date', sinceStr)
    .order('date', { ascending: true });

  return (
    <div>
      {isOwner && (
        <UserSelector
          users={allUsers}
          currentViewId={viewUserId}
          isCollective={false}
          showCollective={false}
        />
      )}
      <AnalyticsClient
        transactions={(transactions ?? []) as unknown as any[]}
      />
    </div>
  );
}
