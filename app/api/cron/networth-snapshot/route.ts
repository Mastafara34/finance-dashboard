/**
 * app/api/cron/networth-snapshot/route.ts
 * ========================================
 * Dijalankan otomatis setiap hari pukul 23:55 WIB (16:55 UTC).
 * Mengambil snapshot Net Worth harian untuk setiap user.
 * 
 * Tabel: net_worth_history
 * Kolom: id, user_id, date, total_assets, total_liabilities, net_worth
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];
  console.log(`[CRON] Net Worth Snapshot started for ${today}`);

  try {
    // 1. Fetch semua user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id');

    if (userError) throw userError;

    const results = [];

    for (const user of users) {
      // 2. Hitung Net Worth saat ini untuk user tersebut
      const { data: assets, error: assetError } = await supabase
        .from('assets')
        .select('value, is_liability')
        .eq('user_id', user.id);

      if (assetError) {
        console.error(`Error fetching assets for user ${user.id}:`, assetError);
        continue;
      }

      const totalAssets = assets
        .filter(a => !a.is_liability)
        .reduce((sum, a) => sum + a.value, 0);
      const totalLiabilities = assets
        .filter(a => a.is_liability)
        .reduce((sum, a) => sum + a.value, 0);
      const netWorth = totalAssets - totalLiabilities;

      // 3. Simpan ke tabel net_worth_history (upsert berdasarkan user_id + date)
      const { error: historyError } = await supabase
        .from('net_worth_history')
        .upsert({
          user_id: user.id,
          date: today,
          total_assets: totalAssets,
          total_liabilities: totalLiabilities,
          net_worth: netWorth
        }, { onConflict: 'user_id,date' });

      if (historyError) {
        console.error(`Error saving history for user ${user.id}:`, historyError);
      } else {
        results.push({ user_id: user.id, netWorth });
      }
    }

    return NextResponse.json({ 
      success: true, 
      date: today, 
      processed: results.length 
    });

  } catch (error: any) {
    console.error('[CRON] Net Worth Snapshot failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
