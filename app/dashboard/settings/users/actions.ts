'use server';

import { createClient } from '@supabase/supabase-js';

// Initialize with service role to manage auth users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function createAuthUser(email: string, password?: string) {
  if (!email) return { error: 'Email is required' };
  
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: password || 'default123456', // Default if not provided
    email_confirm: true
  });

  if (error) return { error: error.message };
  return { data: data.user };
}

export async function updateAuthUser(userId: string, data: { email?: string; password?: string }) {
  if (!userId) return { error: 'User ID is required' };
  
  const updatePayload: any = {};
  if (data.email) updatePayload.email = data.email;
  if (data.password) updatePayload.password = data.password;
  
  if (Object.keys(updatePayload).length === 0) return { error: 'Nothing to update' };

  const { data: user, error } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    updatePayload
  );

  if (error) return { error: error.message };
  return { data: user };
}
