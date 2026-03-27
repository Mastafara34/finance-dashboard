import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import GoalsClient from './GoalsClient';

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const { u: searchU } = await searchParams;
  const supabase = await createClient();
  
  // 1. Parallel Auth/Profile Discovery
  const [{ data: { user } }, { data: profile }] = await Promise.all([
    getCachedUser(),
    getCachedProfile(),
  ]);
  if (!user || !profile) redirect('/login');

  const isOwner = profile.role === 'owner';
  
  // 2. Parallel User Discovery
  const [allUsersRes, demoRes] = await Promise.all([
    isOwner 
      ? supabase.from('users').select('id, display_name').or('email.is.null,email.neq.demo@fintrack.app').order('display_name')
      : Promise.resolve({ data: [] }),
    supabase.from('users').select('id').eq('email', 'demo@fintrack.app').maybeSingle(),
  ]);

  const allUsers = allUsersRes.data ?? [];
  const demoId = demoRes.data?.id;
  const isCollective = isOwner && searchU === 'all';
  const viewUserId = isOwner && searchU && searchU !== 'all' ? (searchU as string) : profile.id;

  // 3. Consolidated Fetch
  const [goalsRes] = await Promise.all([
    (() => {
      let q = supabase.from('goals').select('*').order('priority', { ascending: true }).order('created_at', { ascending: true });
      if (isCollective) {
        const userIds = allUsers.map(u => u.id);
        if (userIds.length > 0) q = q.in('user_id', userIds);
        else q = q.eq('user_id', 'none'); 
      } else {
        q = q.eq('user_id', viewUserId);
      }
      return q;
    })(),
  ]);

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
