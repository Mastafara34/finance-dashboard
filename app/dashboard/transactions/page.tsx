// app/dashboard/transactions/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TransactionsClient from './TransactionsClient';

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', user.email!)
    .maybeSingle();

  if (!profile) redirect('/login');

  const userId = profile.id;
  const isOwner = profile.role === 'owner';

  // Fetch transaksi 3 bulan terakhir + kategori
  const since = new Date();
  since.setMonth(since.getMonth() - 3);

  let query = supabase
    .from('transactions')
    .select('id, amount, type, note, date, source, created_at, categories(id, name, icon)')
    .eq('is_deleted', false)
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);

  // Jika bukan owner, hanya tampilkan data milik sendiri
  if (!isOwner) {
    query = query.eq('user_id', userId);
  }

  const { data: transactions } = await query;

  // Fetch semua kategori untuk dropdown edit
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, type, icon')
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order('sort_order', { ascending: true });

  return (
    <TransactionsClient
      transactions={(transactions ?? []) as unknown as any[]}
      categories={(categories ?? []) as unknown as any[]}
      userId={userId}
    />
  );
}
