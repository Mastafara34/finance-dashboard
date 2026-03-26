// app/dashboard/networth/page.tsx
export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NetWorthClient from './NetWorthClient';
import { UserSelector } from '../components/UserSelector';

export default async function NetWorthPage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const { u: searchU } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('id, role')
    .or(`email.eq.${user.email},id.eq.${user.id}`)
    .maybeSingle();

  if (!profile) return null;

  // Fetch demo ID
  const { data: demo } = await supabase.from('users').select('id').eq('email', 'demo@fintrack.app').maybeSingle();
  const demoId = demo?.id;

  const isOwner = profile.role === 'owner';
  const isCollective = isOwner && searchU === 'all';
  const viewUserId = isOwner && searchU && searchU !== 'all' ? searchU : profile.id;

  // ── 1. Fetch Authorized Users (Owner privilege) ───────────────────────────
  let allUsers: { id: string; display_name: string | null }[] = [];
  if (isOwner) {
    const { data } = await supabase
      .from('users')
      .select('id, display_name')
      .or('email.is.null,email.neq.demo@fintrack.app')
      .order('display_name');
    allUsers = data ?? [];
  }

  // ── 2. Data Fetch ───────────────────────────────────────────
  let q = supabase
    .from('assets')
    .select('*')
    .order('is_liability', { ascending: true })
    .order('value', { ascending: false });

  if (isCollective) {
    const userIds = allUsers.map(u => u.id);
    if (userIds.length > 0) q = q.in('user_id', userIds);
    else q = q.eq('user_id', 'none'); 

    if (demoId) q = q.neq('user_id', demoId);
  } else {
    q = q.eq('user_id', viewUserId);
  }

  const { data: assets } = await q;

  return (
    <div>
      <NetWorthClient
        initialAssets={(assets ?? []) as unknown as any[]}
        userId={viewUserId}
      />
    </div>
  );
}
