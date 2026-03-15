// app/dashboard/budgets/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BudgetsClient from './BudgetsClient';

export default async function BudgetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('email', user.email!)
    .maybeSingle();

  if (!profile) redirect('/login');

  const userId  = profile.id;
  const now     = new Date();
  const month   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthStart = `${month}-01`;

  // Fetch budgets bulan ini
  const { data: budgets } = await supabase
    .from('monthly_budgets')
    .select('id, limit_amount, month, categories(id, name, icon, type)')
    .eq('user_id', userId)
    .eq('month', month);

  // Fetch pengeluaran bulan ini per kategori
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, categories(id, name)')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('is_deleted', false)
    .gte('date', monthStart);

  // Fetch semua kategori expense untuk dropdown
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon, type')
    .eq('type', 'expense')
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order('sort_order', { ascending: true });

  // Hitung spending per category_id
  const spendMap: Record<string, number> = {};
  (transactions ?? []).forEach((t: any) => {
    const catId = t.categories?.id;
    if (catId) spendMap[catId] = (spendMap[catId] ?? 0) + t.amount;
  });

  return (
    <BudgetsClient
      initialBudgets={(budgets ?? []) as unknown as any[]}
      categories={(categories ?? []) as unknown as any[]}
      spendMap={spendMap}
      userId={userId}
      month={month}
    />
  );
}
