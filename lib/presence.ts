import { createClient } from "@/lib/supabase/server";

/**
 * When these people were last seen, as user id -> ISO time. Only includes
 * you and friends who haven't hidden their status (the database decides;
 * see supabase/migrations/20261119010000_online_status.sql). Empty until
 * that update is run.
 */
export async function getPresence(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("presence_for", { ids });
  if (error || !data) return new Map();
  return new Map(
    (data as { user_id: string; last_seen_at: string }[]).map((r) => [r.user_id, r.last_seen_at]),
  );
}

// Your own "show friends when I'm online" setting; null if the database
// update hasn't been run yet.
export async function getShowOnline(userId: string): Promise<boolean | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("show_online")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { show_online: boolean }).show_online;
}
