import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";

const SUPABASE_URL = "https://vjgsytniawoemaxtdnrl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-KYQrbBFDycmaRiufdmIbA_DSQnakad";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export async function signInAsGuest() {
  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) throw error;

  return data;
}