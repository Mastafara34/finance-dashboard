// app/dashboard/goals/page.tsx
export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import GoalsClient from './GoalsClient';
import { UserSelector } from '../components/UserSelector';

export default async function GoalsPage({ searchParams }: { searchParams: { u?: string } }) {
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

  let q = supabase
    .from('goals')
    .select('*')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true });

  if (!isCollective) {
    q = q.eq('user_id', viewUserId);
  }

  const { data: goals } = await q;

  return (
    <div>
      <GoalsClient
        initialGoals={(goals ?? []) as unknown as any[]}
        userId={viewUserId}
      />
    </div>
  );
}
