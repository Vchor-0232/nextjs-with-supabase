"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const INVALID = "Invalid login credentials";

// Logs in with a username instead of an email. Supabase only signs in by
// email, so we look up the account's email on the server with the secret
// key. The email never reaches the browser, and an unknown username gets
// the same error as a wrong password so nobody can probe which names exist.
export async function loginWithUsername(
  username: string,
  password: string,
): Promise<{ error: string | null }> {
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !/^[A-Za-z0-9_]{3,30}$/.test(username) ||
    password.length === 0
  ) {
    return { error: INVALID };
  }

  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) {
    return {
      error: "Username login isn't set up yet. Log in with your email instead.",
    };
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secretKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Usernames are unique ignoring capitals. In ilike "_" is a wildcard, so escape it.
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", username.replace(/_/g, "\\_"))
    .maybeSingle();
  if (!profile) return { error: INVALID };

  const { data: userData } = await admin.auth.admin.getUserById(profile.id);
  const email = userData.user?.email;
  if (!email) return { error: INVALID };

  // Sign in with the normal server client so the session cookies are set.
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error ? error.message : null };
}
