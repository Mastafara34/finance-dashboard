// app/dashboard/networth/page.tsx
export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NetWorthClient from './NetWorthClient';
import { UserSelector } from '../components/UserSelector';

export default async function NetWorthPage({ searchParams }: { searchParams: { u?: string } }) {
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

  let q = supabase
    .from('assets')
    .select('*')
    .order('is_liability', { ascending: true })
    .order('value', { ascending: false });

  if (!isCollective) {
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
