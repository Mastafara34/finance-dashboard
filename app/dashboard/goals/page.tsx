import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import GoalsClient from './GoalsClient';
import { UserSelector } from '../components/UserSelector';

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const { u: searchU } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await getCachedUser();
  if (!user) redirect('/login');

  const { data: profile } = await getCachedProfile();
  if (!profile) return redirect('/login');

  const isOwner = profile.role === 'owner';
  const isCollective = isOwner && searchU === 'all';
  const viewUserId = isOwner && searchU && searchU !== 'all' ? searchU : profile.id;

  // CONSOLIDATED FETCH
  const [goalsRes, demoRes, usersRes] = await Promise.all([
    // 1. Fetch Goals
    (() => {
      let q = supabase.from('goals').select('*').order('priority', { ascending: true }).order('created_at', { ascending: true });
      if (!isCollective) q = q.eq('user_id', viewUserId);
      return q;
    })(),
    // 2. Fetch demo ID
    supabase.from('users').select('id').eq('email', 'demo@fintrack.app').maybeSingle(),
    // 3. All Users (for selector)
    isOwner ? supabase.from('users').select('id, display_name').or('email.is.null,email.neq.demo@fintrack.app').order('display_name') : Promise.resolve({ data: [] })
  ]);

  const demoId = demoRes.data?.id;
  const rawGoals = goalsRes.data ?? [];
  const goalsFiltered = (isCollective && demoId) ? rawGoals.filter((g: any) => g.user_id !== demoId) : rawGoals;

  return (
    <div>
      <GoalsClient
        initialGoals={(goalsFiltered ?? []) as unknown as any[]}
        userId={viewUserId}
      />
    </div>
  );
}
