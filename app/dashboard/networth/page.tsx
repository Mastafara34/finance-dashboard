// app/dashboard/networth/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NetWorthClient from './NetWorthClient';

export default async function NetWorthPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('email', user.email!)
    .maybeSingle();

  if (!profile) redirect('/login');

  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', profile.id)
    .order('is_liability', { ascending: true })
    .order('value', { ascending: false });

  return (
    <NetWorthClient
      initialAssets={(assets ?? []) as unknown as any[]}
      userId={profile.id}
    />
  );
}
