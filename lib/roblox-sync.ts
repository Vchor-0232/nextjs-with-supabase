import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchRobloxGames, placeIdFromUrl } from "@/lib/roblox";

/**
 * Copies visits, likes, players, icons and screenshots from Roblox into
 * roblox_stats, plus today's row in roblox_stats_daily (for Charts).
 * By default for every published game; pass gameIds to sync just those
 * (e.g. games that were just imported). Needs the secret-key client.
 */
export async function syncRobloxStats(supabase: SupabaseClient, gameIds?: string[]) {
  const [gamesRes, existingRes] = await Promise.all([
    gameIds
      ? supabase.from("games").select("id, roblox_url").in("id", gameIds)
      : supabase.from("games").select("id, roblox_url").eq("is_published", true),
    supabase.from("roblox_stats").select("game_id, place_id, universe_id"),
  ]);
  if (gamesRes.error || existingRes.error) {
    throw new Error((gamesRes.error ?? existingRes.error)!.message);
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
        // Columns from the 2026-11-14 migration (dropped below if it hasn't run).
        max_players: i.maxPlayers,
        creator_id: i.creatorId,
        creator_type: i.creatorType,
        roblox_created_at: i.createdAt,
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
    okRows.length ? saveStats(supabase, okRows) : Promise.resolve({ error: null }),
    errorRows.length
      ? supabase
          .from("roblox_stats")
          .upsert(errorRows, { onConflict: "game_id" })
      : Promise.resolve({ error: null }),
  ]);
  const saveError = saveOk.error ?? saveErrors.error;
  if (saveError) throw new Error(saveError.message);

  // Today's numbers for Charts (today / this week / this month). Skipped
  // until the 2026-11-14 migration has been run.
  const day = now.slice(0, 10);
  const { error: dailyError } = okRows.length
    ? await supabase.from("roblox_stats_daily").upsert(
        okRows.map((r) => ({
          game_id: r.game_id,
          day,
          visits: r.visits,
          playing: r.playing,
          up_votes: r.up_votes,
          down_votes: r.down_votes,
        })),
      )
    : { error: null };
  if (dailyError) console.error("Couldn't save daily stats:", dailyError.message);

  return {
    games: games.length,
    synced: okRows.length,
    dailySnapshot: dailyError ? `not saved: ${dailyError.message}` : day,
    failed: errorRows.map((r) => ({ gameId: r.game_id, error: r.sync_error })),
  };
}

const NEW_COLUMNS = ["max_players", "creator_id", "creator_type", "roblox_created_at"] as const;

// Saves the stats, leaving out the newer columns if the database doesn't
// have them yet (the 2026-11-14 migration hasn't been run).
async function saveStats(supabase: SupabaseClient, rows: Record<string, unknown>[]) {
  const first = await supabase.from("roblox_stats").upsert(rows);
  const missingColumn =
    first.error &&
    (first.error.code === "PGRST204" || first.error.code === "42703") &&
    NEW_COLUMNS.some((c) => first.error!.message.includes(c));
  if (!missingColumn) return first;
  const older = rows.map((r) => {
    const copy = { ...r };
    for (const c of NEW_COLUMNS) delete copy[c];
    return copy;
  });
  return supabase.from("roblox_stats").upsert(older);
}
