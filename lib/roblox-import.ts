import type { SupabaseClient } from "@supabase/supabase-js";
import { placeIdFromUrl, searchSmallRobloxGames } from "@/lib/roblox";

// Gamesprout features small Roblox games: under 100K total visits by
// default (set ROBLOX_MAX_VISITS in Vercel to change it). Roblox's charts
// only list huge games, so we search Roblox with a few of these keywords
// each run, picked at random so the mix keeps changing.
const KEYWORDS = [
  "puzzle", "obby", "escape room", "story", "parkour", "tycoon",
  "cafe", "farming", "fishing", "racing", "horror", "mystery",
  "detective", "space", "pet", "building", "art", "music",
  "rhythm", "platformer", "co-op", "survival", "cozy", "minigames",
];
const KEYWORDS_PER_DAY = 4;
const DEFAULT_PER_DAY = 25;
export const DEFAULT_MAX_VISITS = 100_000;

export function maxVisits() {
  const n = Number(process.env.ROBLOX_MAX_VISITS ?? DEFAULT_MAX_VISITS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_VISITS;
}

// A random few keywords per run, so each run (daily, or by hand) finds a
// different mix of games.
function pickKeywords() {
  const shuffled = [...KEYWORDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, KEYWORDS_PER_DAY);
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Adds small Roblox games to the games table (skipping ones already there),
 * owned by the first admin profile. The sync then fills in their numbers.
 * Needs the secret-key client, since it writes as no particular user.
 */
export async function importSmallRobloxGames(supabase: SupabaseClient) {
  const perDay = Number(
    process.env.ROBLOX_IMPORT_PER_DAY ?? process.env.ROBLOX_IMPORT_PER_LIST ?? DEFAULT_PER_DAY,
  );
  if (!Number.isFinite(perDay) || perDay <= 0) {
    return { imported: 0, note: "Import turned off (ROBLOX_IMPORT_PER_DAY=0)", errors: [] };
  }

  // Imported games need an owner in profiles; we use the first admin.
  // "Made by" on the site shows the Roblox creator, not this account.
  const { data: owner, error: ownerError } = await supabase
    .from("profiles")
    .select("id")
    .eq("is_admin", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (ownerError) throw new Error(`Couldn't find an admin profile: ${ownerError.message}`);
  if (!owner) {
    return {
      imported: 0,
      note: "No admin profile yet. Set is_admin = true on one profile to turn on imports.",
      errors: [],
    };
  }

  const [found, gamesRes, statsRes] = await Promise.all([
    // Leave time for the stats sync that runs after this.
    searchSmallRobloxGames({
      keywords: pickKeywords(),
      maxVisits: maxVisits(),
      deadline: Date.now() + 25_000,
    }),
    supabase.from("games").select("roblox_url"),
    supabase.from("roblox_stats").select("place_id"),
  ]);
  if (gamesRes.error) throw new Error(gamesRes.error.message);

  const existing = new Set<number>();
  for (const g of gamesRes.data as { roblox_url: string | null }[]) {
    const id = placeIdFromUrl(g.roblox_url ?? "");
    if (id) existing.add(id);
  }
  for (const r of (statsRes.data ?? []) as { place_id: number | null }[]) {
    if (r.place_id) existing.add(Number(r.place_id));
  }

  const toAdd = found.games.filter((g) => !existing.has(g.placeId)).slice(0, perDay);
  const errors: { game: string; error: string }[] = [];
  const tagIds = new Map<string, number | null>();
  let imported = 0;

  for (const game of toAdd) {
    const { data: row, error } = await supabase
      .from("games")
      .insert({
        developer_id: owner.id,
        title: game.name.trim().slice(0, 60) || "Untitled game",
        roblox_url: `https://www.roblox.com/games/${game.placeId}`,
        is_published: true,
        source: "roblox_import",
      })
      .select("id")
      .single();
    if (error || !row) {
      errors.push({ game: game.name, error: error?.message ?? "Insert failed" });
      continue;
    }
    imported++;

    // Save the IDs now so the sync doesn't need to look them up.
    await supabase
      .from("roblox_stats")
      .upsert({ game_id: row.id, place_id: game.placeId, universe_id: game.universeId });

    // Tag it with its Roblox genre (e.g. "Simulation"). Nice to have, so
    // a failure here doesn't stop the import.
    if (game.genre) {
      const tagId = await findOrCreateTag(supabase, game.genre, tagIds);
      if (tagId) {
        await supabase.from("game_tags").insert({ game_id: row.id, tag_id: tagId });
      }
    }
  }

  return {
    imported,
    searched: found.searched,
    smallGamesFound: found.games.length,
    searchErrors: found.errors,
    maxVisits: maxVisits(),
    errors,
  };
}

async function findOrCreateTag(
  supabase: SupabaseClient,
  name: string,
  cache: Map<string, number | null>,
) {
  const slug = slugify(name);
  if (cache.has(slug)) return cache.get(slug)!;

  let { data } = await supabase.from("tags").select("id").eq("slug", slug).maybeSingle();
  if (!data) {
    const res = await supabase.from("tags").insert({ name, slug }).select("id").maybeSingle();
    if (res.error) console.error(`Couldn't add tag ${name}:`, res.error.message);
    data = res.data;
  }
  const id = data ? Number(data.id) : null;
  cache.set(slug, id);
  return id;
}
