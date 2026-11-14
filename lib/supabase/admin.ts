import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// A Supabase client using the secret key, which skips the database's
// security rules. Server code only (route handlers and server actions);
// never import this from a "use client" file. Returns null when the key
// isn't set.
export function createAdminClient() {
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) return null;
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
