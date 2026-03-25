// app/dashboard/analytics/page.tsx
export const dynamic = 'force-dynamic';
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
    .or(`email.eq."${user.email}",id.eq."${user.id}"`)
    .maybeSingle();

  if (!profile) return null;

  const isOwner = profile.role === 'owner';
  const searchU = searchParams.u;
  const isCollective = isOwner && searchU === 'all';
  const viewUserId = isOwner && searchU && searchU !== 'all' ? searchU : profile.id;

  let allUsers: any[] = [];
  if (isOwner) {
    const { data } = await supabase
      .from('users')
      .select('id, display_name')
      .or('email.is.null,email.neq.demo@fintrack.app')
      .order('display_name');
    allUsers = data ?? [];
  }

  // Fetch 12 bulan terakhir untuk analisis lengkap
  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  const sinceStr = since.toISOString().split('T')[0];

  let q = supabase
    .from('transactions')
    .select('amount, type, date, categories(name, icon)')
    .eq('is_deleted', false)
    .gte('date', sinceStr)
    .order('date', { ascending: true });

  if (!isCollective) {
    q = q.eq('user_id', viewUserId);
  }

  const { data: transactions } = await q;

  return (
    <div>
      <AnalyticsClient
        transactions={(transactions ?? []) as unknown as any[]}
      />
    </div>
  );
}
