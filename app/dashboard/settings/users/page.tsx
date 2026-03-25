// app/dashboard/settings/users/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import UsersClient from './UsersClient';

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Cek apakah user ini owner atau admin
  const { data: profile } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', user.email!)
    .maybeSingle();

  if (!profile) redirect('/login');

  // Hanya owner dan admin yang boleh akses halaman ini
  if (!['owner', 'admin'].includes(profile.role)) {
    redirect('/dashboard/settings');
  }

  // Fetch semua user — kecuali demo (shadow account)
  const { data: users } = await supabase
    .from('users')
    .select('id, display_name, email, telegram_chat_id, role, monthly_income, onboarded_at, created_at')
    .or('email.is.null,email.neq.demo@fintrack.app')
    .order('created_at', { ascending: true });

  // Fetch whitelist untuk status bot
  const { data: whitelist } = await supabase
    .from('whitelisted_users')
    .select('chat_id, role, is_active');

  return (
    <UsersClient
      currentUserId={profile.id}
      currentUserRole={profile.role as 'owner' | 'admin'}
      users={(users ?? []) as unknown as any[]}
      whitelist={(whitelist ?? []) as unknown as any[]}
    />
  );
}
