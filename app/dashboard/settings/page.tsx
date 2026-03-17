// app/dashboard/settings/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('id, display_name, email, telegram_chat_id, monthly_income, timezone, currency, role, theme')
    .eq('email', user.email!)
    .maybeSingle();

  if (!profile) redirect('/login');

  // Fetch kategori milik user + sistem
  const { data: categories } = await supabase
    .from('categories')
    .select('id, display_name, email, telegram_chat_id, monthly_income, timezone, currency, role')
    .or(`user_id.eq.${profile.id},user_id.is.null`)
    .order('type', { ascending: true })
    .order('sort_order', { ascending: true });

  return (
    <SettingsClient
      profile={profile as any}
      categories={(categories ?? []) as unknown as any[]}
      authEmail={user.email ?? ''}
    />
  );
}
