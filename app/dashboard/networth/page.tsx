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
    .eq('email', user.email!)
    .maybeSingle();

  if (!profile) redirect('/login');

  const isOwner = profile.role === 'owner';
  const searchU = searchParams.u;
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

  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', viewUserId)
    .order('is_liability', { ascending: true })
    .order('value', { ascending: false });

  return (
    <div>
      <NetWorthClient
        initialAssets={(assets ?? []) as unknown as any[]}
        userId={viewUserId}
      />
    </div>
  );
}
