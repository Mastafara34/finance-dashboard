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

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // Fetch budgets bulan ini & bulan lalu
  const [{ data: budgets }, { data: prevBudgets }] = await Promise.all([
    supabase.from('monthly_budgets').select('id, limit_amount, month, categories(id, name, icon, type)')
      .eq('user_id', userId).eq('month', month),
    supabase.from('monthly_budgets').select('limit_amount, category_id')
      .eq('user_id', userId).eq('month', prevMonthStr),
  ]);

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

  // Fetch user targets (dengan fallback jika kolom belum ada)
  const { data: userTargets, error: targetError } = await supabase
    .from('users')
    .select('role, saving_target, wants_target, needs_target')
    .eq('id', userId)
    .maybeSingle();

  let finalRole = userTargets?.role || 'user';
  
  // Jika targetError terjadi (kemungkinan kolom belum ada), ambil role saja
  if (targetError) {
    const { data: roleOnly } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (roleOnly) finalRole = roleOnly.role;
  }

  const safeTargets = {
    role: finalRole,
    saving: userTargets?.saving_target ?? 20,
    wants: userTargets?.wants_target ?? 30,
    needs: userTargets?.needs_target ?? 50
  };

  return (
    <BudgetsClient
      initialBudgets={(budgets ?? []) as unknown as any[]}
      prevMonthBudgets={(prevBudgets ?? []) as any[]}
      categories={(categories ?? []) as unknown as any[]}
      spendMap={spendMap}
      userId={userId}
      month={month}
      userRole={safeTargets.role}
      initialTargets={{
        saving: safeTargets.saving,
        wants: safeTargets.wants,
        needs: safeTargets.needs,
      }}
    />
  );
}
