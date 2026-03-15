// app/dashboard/analytics/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AnalyticsClient from './AnalyticsClient';

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('email', user.email!)
    .maybeSingle();

  if (!profile) redirect('/login');

  const userId = profile.id;

  // Fetch 12 bulan terakhir untuk analisis lengkap
  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  const sinceStr = since.toISOString().split('T')[0];

  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, type, date, categories(name, icon)')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .gte('date', sinceStr)
    .order('date', { ascending: true });

  return (
    <AnalyticsClient
      transactions={(transactions ?? []) as unknown as any[]}
    />
  );
}
