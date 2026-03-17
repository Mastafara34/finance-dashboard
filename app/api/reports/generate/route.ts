// app/api/reports/generate/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type } = await request.json();
  const now = new Date();
  let start = new Date();
  
  if (type === 'weekly') {
    start.setDate(now.getDate() - 7);
  } else {
    start.setMonth(now.getMonth() - 1);
  }

  const startDate = start.toISOString().split('T')[0];
  const endDate = now.toISOString().split('T')[0];

  // Fetch transactions for the period
  const { data: txs } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .gte('date', startDate)
    .lte('date', endDate);

  const income = txs?.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) || 0;
  const expense = txs?.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) || 0;
  const saving_rate = income > 0 ? ((income - expense) / income) * 100 : 0;

  const reportData = {
    income,
    expense,
    saving_rate,
    transaction_count: txs?.length || 0
  };

  const { data: profile } = await supabase
    .from('users')
    .select('saving_target')
    .eq('id', user.id)
    .single();

  const savingTarget = profile?.saving_target || 20;

  const { data: newReport, error } = await supabase
    .from('financial_reports')
    .insert({
      user_id: user.id,
      type,
      period_start: startDate,
      period_end: endDate,
      data: reportData,
      status: saving_rate >= savingTarget ? 'achieved' : 'missed'
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(newReport);
}
