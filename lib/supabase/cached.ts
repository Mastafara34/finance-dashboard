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
  
  // 1. Explicit ID/Email lookup (used for viewing others)
  if (userId) return await supabase.from('users').select('*').eq('id', userId).maybeSingle() as any;
  if (email) return await supabase.from('users').select('*').ilike('email', email).maybeSingle() as any;

  // 2. Auth context lookup
  const { data: { user } } = await getCachedUser();
  if (!user) return { data: null, error: null };

  // Strategi 1: Cari berdasarkan ID (Paling Aman/RLS)
  let { data: profile, error: idError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // Strategi 2: Cari berdasarkan Email (Resiliensi jika ID berubah)
  if (!profile && user.email) {
    const { data: byEmail, error: emailError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', user.email)
      .maybeSingle();
    
    if (byEmail) {
      profile = byEmail as Profile;
      // Jika profil ditemukan via email tapi ID beda, ini anomali (migrasi/reset)
      // Kita bisa log di sini atau biarkan aplikasi menggunakan profil ini.
    }
  }

  // Strategi 3: Auto-Register jika benar-benar tidak ada
  if (!profile) {
    const insertData = {
      id: user.id,
      email: user.email || null,
      display_name: user.email ? user.email.split('@')[0] : `User_${user.id.slice(0, 5)}`,
      role: 'user'
    };

    const { data: newProfile, error: createError } = await supabase
      .from('users')
      .insert([insertData])
      .select('*')
      .maybeSingle();
    
    if (!createError && newProfile) return { data: newProfile as Profile, error: null };
    
    // Jika gagal insert (mungkin karena duplikat email yang terdeteksi di DB tapi tidak terlihat di select karena RLS)
    // Beritahukan error spesifik jika memungkinkan
    if (createError) {
      console.error('Registration failed for:', user.email, createError);
      return { data: null, error: createError };
    }
  }

  return { data: profile, error: idError };
});
