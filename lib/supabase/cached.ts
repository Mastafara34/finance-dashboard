// lib/supabase/cached.ts
import { cache } from 'react';
import { createClient } from './server';

/**
 * Cached version of getUser to avoid redundant auth calls in the same request.
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  return await supabase.auth.getUser();
});

/**
 * Cached version of the profile fetcher.
 */
export const getCachedProfile = cache(async (userId?: string, email?: string) => {
  const supabase = await createClient();
  
  if (userId) {
    let q = supabase
      .from('users')
      .select('id, email, display_name, telegram_chat_id, role, saving_target, wants_target, needs_target')
      .eq('id', userId);
    
    return await q.maybeSingle();
  }

  if (email) {
    let q = supabase
      .from('users')
      .select('id, email, display_name, telegram_chat_id, role, saving_target, wants_target, needs_target')
      .ilike('email', email);
    
    return await q.maybeSingle();
  }

  // Fallback to current authenticated user if no params provided
  const { data: { user } } = await getCachedUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  return await supabase
    .from('users')
    .select('id, email, display_name, telegram_chat_id, role, saving_target, wants_target, needs_target')
    .or(`id.eq.${user.id},email.ilike.${user.email}`)
    .maybeSingle();
});
