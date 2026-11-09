import { createClient as createAdminClient } from "@supabase/supabase-js";
import { fetchRobloxGames, placeIdFromUrl } from "@/lib/roblox";
import { importSmallRobloxGames, maxVisits } from "@/lib/roblox-import";

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

  const [gamesRes, existingRes] = await Promise.all([
    supabase.from("games").select("id, roblox_url").eq("is_published", true),
    supabase.from("roblox_stats").select("game_id, place_id, universe_id"),
  ]);
  if (gamesRes.error || existingRes.error) {
    return Response.json(
      { error: (gamesRes.error ?? existingRes.error)!.message },
      { status: 500 },
    );
  }

  const games = gamesRes.data as { id: string; roblox_url: string }[];
  const knownUniverses = new Map<number, number>();
  for (const row of existingRes.data as {
    place_id: number | null;
    universe_id: number | null;
  }[]) {
    if (row.place_id && row.universe_id) {
      knownUniverses.set(Number(row.place_id), Number(row.universe_id));
    }
  }

  const placeByGame = new Map(
    games.map((g) => [g.id, placeIdFromUrl(g.roblox_url ?? "")]),
  );
  const lookups = await fetchRobloxGames(
    [...placeByGame.values()].filter((p): p is number => p !== null),
    knownUniverses,
  );

  const now = new Date().toISOString();
  const okRows = [];
  const errorRows = [];
  for (const game of games) {
    const placeId = placeByGame.get(game.id) ?? null;
    const lookup = placeId === null ? null : lookups.get(placeId);

    if (lookup?.ok) {
      const i = lookup.info;
      okRows.push({
        game_id: game.id,
        place_id: i.placeId,
        universe_id: i.universeId,
        name: i.name,
        description: i.description,
        creator_name: i.creatorName,
        visits: i.visits,
        playing: i.playing,
        favorites: i.favorites,
        up_votes: i.upVotes,
        down_votes: i.downVotes,
        icon_url: i.iconUrl,
        screenshot_urls: i.screenshotUrls,
        roblox_updated_at: i.updatedAt,
        synced_at: now,
        sync_error: null,
      });
    } else {
      // Keep the last good numbers; just record what went wrong.
      errorRows.push({
        game_id: game.id,
        place_id: placeId,
        synced_at: now,
        sync_error:
          placeId === null
            ? "Roblox link doesn't contain a game ID (expected roblox.com/games/123...)"
            : (lookup && !lookup.ok ? lookup.error : "Not looked up"),
      });
    }
  }

  const [saveOk, saveErrors] = await Promise.all([
    okRows.length
      ? supabase.from("roblox_stats").upsert(okRows)
      : Promise.resolve({ error: null }),
    errorRows.length
      ? supabase
          .from("roblox_stats")
          .upsert(errorRows, { onConflict: "game_id" })
      : Promise.resolve({ error: null }),
  ]);
  const saveError = saveOk.error ?? saveErrors.error;
  if (saveError) {
    return Response.json({ error: saveError.message }, { status: 500 });
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
    games: games.length,
    synced: okRows.length,
    failed: errorRows.map((r) => ({ gameId: r.game_id, error: r.sync_error })),
  });
}
