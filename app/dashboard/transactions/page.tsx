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
    .eq('email', user.email!)
    .maybeSingle();

  if (!profile) redirect('/login');

  const myUserId = profile.id;
  const isOwner = profile.role === 'owner';
  
  const searchU = searchParams.u || myUserId;
  const viewUserId = searchU;

  let allUsers: any[] = [];
  if (isOwner) {
    const { data } = await supabase.from('users').select('id, display_name').order('display_name');
    allUsers = data ?? [];
  }

  // Fetch transaksi 3 bulan terakhir + kategori
  const since = new Date();
  since.setMonth(since.getMonth() - 3);

  let query = supabase
    .from('transactions')
    .select('id, amount, type, note, date, source, created_at, categories(id, name, icon)')
    .eq('user_id', viewUserId)
    .eq('is_deleted', false)
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);

  const { data: transactions } = await query;

  // Fetch kategori viewUserId
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, type, icon')
    .or(`user_id.eq.${viewUserId},user_id.is.null`)
    .order('sort_order', { ascending: true });

  return (
    <div style={{ padding: '0px' }}>
      {isOwner && (
        <UserSelector 
          users={allUsers} 
          currentViewId={viewUserId} 
          isCollective={false} 
        />
      )}
      <TransactionsClient
        transactions={(transactions ?? []) as unknown as any[]}
        categories={(categories ?? []) as unknown as any[]}
        userId={viewUserId}
      />
    </div>
  );
}
