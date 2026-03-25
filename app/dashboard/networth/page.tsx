// app/dashboard/networth/page.tsx
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
      .or('email.is.null,email.neq.demo@fintrack.app')
      .order('display_name');
    allUsers = data ?? [];
  }

  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', viewUserId)
    .order('is_liability', { ascending: true })
    .order('value', { ascending: false });

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
      <NetWorthClient
        initialAssets={(assets ?? []) as unknown as any[]}
        userId={viewUserId}
      />
    </div>
  );
}
