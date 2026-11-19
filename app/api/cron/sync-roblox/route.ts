import { createClient as createAdminClient } from "@supabase/supabase-js";
import { importSmallRobloxGames, maxVisits } from "@/lib/roblox-import";
import { syncRobloxStats } from "@/lib/roblox-sync";

// 1. Imports small Roblox games (under ROBLOX_MAX_VISITS visits) that
//    aren't on Gamesprout yet.
// 2. Copies visits, likes, players, icons and screenshots for every
//    published game into the roblox_stats table.
// 3. Hides imported games that have grown past the limit, so the site
//    keeps featuring small games. Games people added themselves are never
//    hidden, and hidden games keep their reviews.
// Vercel calls this once a day (see vercel.json) and sends the CRON_SECRET,
// so nobody else can trigger it.
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) {
    return Response.json({ error: "SUPABASE_SECRET_KEY is not set" }, { status: 500 });
  }

  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secretKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // An import problem shouldn't stop the stats sync, so catch it here.
  let importResult: unknown;
  try {
    importResult = await importSmallRobloxGames(supabase);
  } catch (e) {
    importResult = { imported: 0, error: e instanceof Error ? e.message : String(e) };
  }

  let sync;
  try {
    sync = await syncRobloxStats(supabase);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  // Hide imported games at or over the visit limit, going by the latest
  // numbers we have (including games Roblox didn't return today).
  const limit = maxVisits();
  const { data: bigRows, error: bigError } = await supabase
    .from("roblox_stats")
    .select("game_id")
    .gte("visits", limit);
  if (bigError) console.error("Couldn't check for big games:", bigError.message);
  const tooBig = (bigRows ?? []).map((r: { game_id: string }) => r.game_id);
  let hidden = 0;
  if (tooBig.length) {
    const { data, error } = await supabase
      .from("games")
      .update({ is_published: false })
      .in("id", tooBig)
      .eq("source", "roblox_import")
      .eq("is_published", true)
      .select("id");
    if (error) console.error("Couldn't hide big games:", error.message);
    hidden = data?.length ?? 0;
  }

  return Response.json({
    import: importResult,
    hiddenOverLimit: hidden,
    ...sync,
  });
}
