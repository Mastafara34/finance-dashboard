// app/dashboard/goals/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import GoalsClient from './GoalsClient';

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('email', user.email!)
    .maybeSingle();

  if (!profile) redirect('/login');

  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', profile.id)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true });

  return (
    <GoalsClient
      initialGoals={(goals ?? []) as unknown as any[]}
      userId={profile.id}
    />
  );
}
