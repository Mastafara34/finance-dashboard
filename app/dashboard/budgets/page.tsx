// app/dashboard/budgets/page.tsx
export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BudgetsClient from './BudgetsClient';
import { UserSelector } from '../components/UserSelector';

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const { u: searchU } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('id, role')
    .or(`email.eq.${user.email},id.eq.${user.id}`)
    .maybeSingle();

  if (!profile) return null;

  const isOwner = profile.role === 'owner';
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

  const now     = new Date();
  const month   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthStart = `${month}-01`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  let bq = supabase.from('monthly_budgets').select('id, limit_amount, month, categories(id, name, icon, type)')
    .eq('month', month);
  let pbq = supabase.from('monthly_budgets').select('limit_amount, category_id')
    .eq('month', prevMonthStr);

  if (!isCollective) {
    bq = bq.eq('user_id', viewUserId);
    pbq = pbq.eq('user_id', viewUserId);
  }

  const [{ data: budgets }, { data: prevBudgets }] = await Promise.all([bq, pbq]);

  let tq = supabase
    .from('transactions')
    .select('amount, categories(id, name)')
    .eq('type', 'expense')
    .eq('is_deleted', false)
    .gte('date', monthStart);

  if (!isCollective) {
    tq = tq.eq('user_id', viewUserId);
  }

  const { data: transactions } = await tq;

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon, type')
    .eq('type', 'expense')
    .or(`user_id.eq.${viewUserId},user_id.is.null`)
    .order('sort_order', { ascending: true });

  const spendMap: Record<string, number> = {};
  (transactions ?? []).forEach((t: any) => {
    const catId = t.categories?.id;
    if (catId) spendMap[catId] = (spendMap[catId] ?? 0) + t.amount;
  });

  const { data: userTargets, error: targetError } = await supabase
    .from('users')
    .select('role, saving_target, wants_target, needs_target')
    .eq('id', viewUserId)
    .maybeSingle();

  let finalRole = userTargets?.role || 'user';
  if (targetError) {
    const { data: roleOnly } = await supabase.from('users').select('role').eq('id', viewUserId).maybeSingle();
    if (roleOnly) finalRole = roleOnly.role;
  }

  const safeTargets = {
    role: finalRole,
    saving: userTargets?.saving_target ?? 20,
    wants: userTargets?.wants_target ?? 30,
    needs: userTargets?.needs_target ?? 50
  };

  return (
    <div>
      <BudgetsClient
        initialBudgets={(budgets ?? []) as unknown as any[]}
        prevMonthBudgets={(prevBudgets ?? []) as any[]}
        categories={(categories ?? []) as unknown as any[]}
        spendMap={spendMap}
        userId={viewUserId}
        month={month}
        userRole={safeTargets.role}
        initialTargets={{
          saving: safeTargets.saving,
          wants: safeTargets.wants,
          needs: safeTargets.needs,
        }}
      />
    </div>
  );
}
