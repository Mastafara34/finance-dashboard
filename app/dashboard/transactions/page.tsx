export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import TransactionsClient from './TransactionsClient';

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const { u: searchU } = await searchParams;
  const supabase = await createClient();
  
  // 1. Parallel Auth/Profile Discovery
  const [{ data: { user } }, { data: profile }] = await Promise.all([
    getCachedUser(),
    getCachedProfile(),
  ]);
  if (!user || !profile) redirect('/login');

  const isOwner = profile.role === 'owner';

  // 2. Parallel User Discovery
  const [allUsersRes, demoRes] = await Promise.all([
    isOwner 
      ? supabase.from('users').select('id, display_name').or('email.is.null,email.neq.demo@fintrack.app').order('display_name')
      : Promise.resolve({ data: [] }),
    supabase.from('users').select('id').eq('email', 'demo@fintrack.app').maybeSingle(),
  ]);

  const allUsers = allUsersRes.data ?? [];
  const demoId = demoRes.data?.id;
  const isCollective = isOwner && searchU === 'all';
  const viewUserId = isOwner && searchU && searchU !== 'all' ? (searchU as string) : profile.id;

  // 3. Consolidated Fetch: Transaksi 3 bulan terakhir + kategori
  const since = new Date();
  since.setMonth(since.getMonth() - 3);

  let query = supabase
    .from('transactions')
    .select('id, amount, type, note, date, source, created_at, user_id, categories(id, name, icon)')
    .eq('is_deleted', false)
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);

  if (isCollective) {
    const userIds = allUsers.map(u => u.id);
    if (userIds.length > 0) query = query.in('user_id', userIds);
    else query = query.eq('user_id', 'none'); 

    if (demoId) query = query.neq('user_id', demoId);
  } else {
    query = query.eq('user_id', viewUserId);
  }

  // Categories fetch can happen in parallel with transactions
  const catQuery = supabase
    .from('categories')
    .select('id, name, type, icon')
    .order('sort_order', { ascending: true });

  const [transactionsRes, categoriesRes] = await Promise.all([
    query,
    isCollective ? catQuery : catQuery.or(`user_id.eq.${viewUserId},user_id.is.null`)
  ]);

  const transactions = transactionsRes.data ?? [];
  const categories = categoriesRes.data ?? [];

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
