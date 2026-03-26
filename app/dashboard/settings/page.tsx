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
    .select('id, display_name, email, telegram_chat_id, monthly_income, timezone, currency, role, notify_weekly, notify_monthly, notify_ai')
    .or(`email.eq.${user.email},id.eq.${user.id}`)
    .maybeSingle();

  if (!profile) return null;

  // Fetch kategori milik user + sistem
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, type, icon, sort_order')
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
