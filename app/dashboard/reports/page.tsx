// app/dashboard/reports/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReportsClient from './ReportsClient';

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users').select('id')
    .eq('id', user.id).maybeSingle();
  if (!profile) return null;

  const { data: reports } = await supabase
    .from('financial_reports')
    .select('*')
    .eq('user_id', profile.id)
    .order('period_start', { ascending: false });

  return <ReportsClient initialReports={reports ?? []} userId={profile.id} />;
}
