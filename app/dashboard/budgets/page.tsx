import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import BudgetsClient from './BudgetsClient';

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ u?: string; month?: string }> }) {
  const { u: searchU, month: queryMonth } = await searchParams;
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

  // 3. Date Setup
  // If queryMonth is provided (e.g., '2026-02'), use it. Otherwise, use current month.
  let validMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  if (queryMonth && /^\d{4}-\d{2}$/.test(queryMonth)) {
    validMonth = queryMonth;
  }
  
  const [yearStr, monthStr] = validMonth.split('-');
  const now = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 15); // middle of the selected month
  const month = validMonth;
  const monthStart = `${month}-01`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  
  const historyStart = new Date(now.getFullYear(), now.getMonth() - 12, 1).toISOString().split('T')[0];

  // 4. Consolidated Parallel Fetch
  const [budgetsRes, prevBudgetsRes, historyBudgetsRes, transactionsRes, historyTxsRes, categoriesRes, targetsRes] = await Promise.all([
    // A. Current Budgets
    (() => {
      let q = supabase.from('monthly_budgets').select('id, limit_amount, month, user_id, categories(id, name, icon, type)').eq('month', month);
      if (isCollective) {
        const userIds = allUsers.map(u => u.id);
        if (userIds.length > 0) q = q.in('user_id', userIds);
        else q = q.eq('user_id', 'none');
      } else {
        q = q.eq('user_id', viewUserId);
      }
      return q;
    })(),
    // B. Previous Budgets
    (() => {
      let q = supabase.from('monthly_budgets').select('limit_amount, category_id, user_id').eq('month', prevMonthStr);
      if (isCollective) {
        const userIds = allUsers.map(u => u.id);
        if (userIds.length > 0) q = q.in('user_id', userIds);
        else q = q.eq('user_id', 'none');
      } else {
        q = q.eq('user_id', viewUserId);
      }
      return q;
    })(),
    // C. History Budgets (Last 12 Months)
    (() => {
      let q = supabase.from('monthly_budgets').select('limit_amount, month, user_id, categories(id, name, icon)').gte('month', historyStart.slice(0, 7)).lt('month', month);
      if (isCollective) {
        const userIds = allUsers.map(u => u.id);
        if (userIds.length > 0) q = q.in('user_id', userIds);
        else q = q.eq('user_id', 'none');
      } else {
        q = q.eq('user_id', viewUserId);
      }
      return q;
    })(),
    // D. Transactions (Current Month)
    (() => {
      let q = supabase.from('transactions').select('amount, user_id, category_id, categories(id, name)').eq('type', 'expense').eq('is_deleted', false).gte('date', monthStart);
      if (isCollective) {
        const userIds = allUsers.map(u => u.id);
        if (userIds.length > 0) q = q.in('user_id', userIds);
        else q = q.eq('user_id', 'none');
      } else {
        q = q.eq('user_id', viewUserId);
      }
      return q;
    })(),
    // E. History Transactions (Last 12 Months)
    (() => {
      let q = supabase.from('transactions').select('amount, date, user_id, category_id').eq('type', 'expense').eq('is_deleted', false).gte('date', historyStart).lt('date', monthStart);
      if (isCollective) {
        const userIds = allUsers.map(u => u.id);
        if (userIds.length > 0) q = q.in('user_id', userIds);
        else q = q.eq('user_id', 'none');
      } else {
        q = q.eq('user_id', viewUserId);
      }
      return q;
    })(),
    // F. Categories
    supabase.from('categories').select('id, name, icon, type').eq('type', 'expense').or(`user_id.eq.${viewUserId},user_id.is.null`).order('sort_order', { ascending: true }),
    // G. User Targets 
    supabase.from('users').select('role, saving_target, wants_target, needs_target').eq('id', viewUserId).maybeSingle()
  ]);

  // JS-level filtering for collective view
  const budgetsRaw = budgetsRes.data ?? [];
  const budgets = (isCollective && demoId) ? budgetsRaw.filter((b: any) => b.user_id !== demoId) : budgetsRaw;

  const prevBudgetsRaw = prevBudgetsRes.data ?? [];
  const prevBudgets = (isCollective && demoId) ? prevBudgetsRaw.filter((b: any) => b.user_id !== demoId) : prevBudgetsRaw;

  const historyBudgetsRaw = historyBudgetsRes.data ?? [];
  const historyBudgets = (isCollective && demoId) ? historyBudgetsRaw.filter((b: any) => b.user_id !== demoId) : historyBudgetsRaw;

  const transactionsRaw = transactionsRes.data ?? [];
  const transactions = (isCollective && demoId) ? transactionsRaw.filter((t: any) => t.user_id !== demoId) : transactionsRaw;

  const historyTxsRaw = historyTxsRes.data ?? [];
  const historyTxs = (isCollective && demoId) ? historyTxsRaw.filter((t: any) => t.user_id !== demoId) : historyTxsRaw;

  const categories = categoriesRes.data ?? [];
  const userTargets = targetsRes.data;

  const spendMap: Record<string, number> = {};
  transactions.forEach((t: any) => {
    const catId = t.category_id || t.categories?.id;
    if (catId) spendMap[catId] = (spendMap[catId] ?? 0) + t.amount;
  });

  const safeTargets = {
    role: userTargets?.role || 'user',
    saving: userTargets?.saving_target ?? 20,
    wants: userTargets?.wants_target ?? 30,
    needs: userTargets?.needs_target ?? 50
  };

  return (
    <div>
      <BudgetsClient
        initialBudgets={(budgets ?? []) as unknown as any[]}
        prevMonthBudgets={(prevBudgets ?? []) as any[]}
        historyBudgets={(historyBudgets ?? []) as any[]}
        historyTxs={(historyTxs ?? []) as any[]}
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
