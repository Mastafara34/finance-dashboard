export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UserSelector } from '../components/UserSelector';
import TransactionsClient from './TransactionsClient';

export default async function TransactionsPage({ searchParams }: { searchParams: { u?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('id, role')
    .or(`email.eq.${user.email},id.eq.${user.id}`)
    .maybeSingle();

  if (!profile) return null;

  const myUserId = profile.id;
  const isOwner = profile.role === 'owner';
  
  const searchU = searchParams.u;
  const isCollective = isOwner && searchU === 'all';
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

  if (!isCollective) {
    query = query.eq('user_id', viewUserId);
  }

  const { data: transactions } = await query;

  // Fetch kategori viewUserId
  let catQuery = supabase
    .from('categories')
    .select('id, name, type, icon')
    .order('sort_order', { ascending: true });

  if (!isCollective) {
    catQuery = catQuery.or(`user_id.eq.${viewUserId},user_id.is.null`);
  }

  const { data: categories } = await catQuery;

  return (
    <div style={{ padding: '0px' }}>
      <TransactionsClient
        transactions={(transactions ?? []) as unknown as any[]}
        categories={(categories ?? []) as unknown as any[]}
        userId={viewUserId}
      />
    </div>
  );
}
