import { cache } from 'react';
import { createClient } from './server';

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  telegram_chat_id: string | null;
  role: string | null;
  saving_target?: number;
  wants_target?: number;
  needs_target?: number;
}

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
export const getCachedProfile = cache(async (userId?: string, email?: string): Promise<{ data: Profile | null; error: any }> => {
  const supabase = await createClient();
  
  if (userId) {
    return await supabase
      .from('users')
      .select('id, email, display_name, telegram_chat_id, role, saving_target, wants_target, needs_target')
      .eq('id', userId)
      .maybeSingle() as any;
  }

  if (email) {
    return await supabase
      .from('users')
      .select('id, email, display_name, telegram_chat_id, role, saving_target, wants_target, needs_target')
      .ilike('email', email)
      .maybeSingle() as any;
  }

  // Fallback to current authenticated user
  const { data: { user } } = await getCachedUser();
  if (!user) return { data: null, error: null };

  // Try fetching by ID first
  // We use only essential columns that are guaranteed to exist to avoid query failure
  let result = await supabase
    .from('users')
    .select('id, email, display_name, telegram_chat_id, role, saving_target, wants_target, needs_target')
    .eq('id', user.id)
    .maybeSingle();

  let profile = result.data as Profile | null;
  let error = result.error;

  // If ID fails and we have an email, try fetching by Email
  if (!profile && !error && user.email) {
    const { data: byEmail } = await supabase
      .from('users')
      .select('id, email, display_name, telegram_chat_id, role, saving_target, wants_target, needs_target')
      .ilike('email', user.email)
      .maybeSingle();
    if (byEmail) profile = byEmail as Profile;
  }

  // Fallback: If query fails, let's try WITHOUT the target columns (older schema)
  if (error || (!profile && user.email)) {
    const { data: fallback } = await supabase
      .from('users')
      .select('id, email, display_name, telegram_chat_id, role')
      .eq('id', user.id)
      .maybeSingle();
    if (fallback) {
      profile = fallback as Profile;
      error = null;
    }
  }

  // AUTO-REGISTER: If missing, create it immediately
  if (!profile && !error) {
    const insertData = {
      id: user.id,
      email: user.email || null,
      display_name: user?.email ? user.email.split('@')[0] : `User_${user.id.slice(0, 5)}`,
      role: 'user'
    };

    const { data: newProfile, error: createError } = await supabase
      .from('users')
      .insert([insertData])
      .select('id, email, display_name, telegram_chat_id, role')
      .maybeSingle();
    
    if (!createError && newProfile) return { data: newProfile as Profile, error: null };
    if (createError) console.error('Auto-registration error:', createError);
  }

  return { data: profile, error };
});
