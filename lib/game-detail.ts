import { createClient } from "@/lib/supabase/server";

export type GameDetail = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  madeBy: string | null;
  tags: string[];
  // Gamesprout's own star ratings (ratings table, via game_stats)
  avgStars: number | null;
  starCount: number;
  // Copied from Roblox by the daily sync; null until the first sync
  roblox: {
    visits: number;
    playing: number;
    favorites: number;
    likes: number;
    dislikes: number;
    likePct: number | null;
    iconUrl: string | null;
    screenshotUrls: string[];
    updatedOnRoblox: string | null;
    syncedAt: string;
    syncError: string | null;
  } | null;
};

const num = (v: unknown) => (v == null ? 0 : Number(v));

// One game for its Gamesprout page. The database's rules decide whether this
// visitor may see it (published games, or the developer's own).
export async function getGameDetail(id: string): Promise<GameDetail | null> {
  // Game IDs are UUIDs; anything else can't exist, so skip the lookup.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const supabase = await createClient();

  const { data: game } = await supabase
    .from("games")
    .select("id, title, description, thumbnail_url, developer_id")
    .eq("id", id)
    .maybeSingle();
  if (!game) return null;

  const [devRes, statsRes, tagsRes, robloxRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", game.developer_id)
      .maybeSingle(),
    supabase
      .from("game_stats")
      .select("avg_rating, rating_count")
      .eq("game_id", id)
      .maybeSingle(),
    supabase.from("game_tags").select("tags(name)").eq("game_id", id),
    supabase
      .from("roblox_stats")
      .select(
        "creator_name, description, visits, playing, favorites, up_votes, down_votes, icon_url, screenshot_urls, roblox_updated_at, synced_at, sync_error",
      )
      .eq("game_id", id)
      .maybeSingle(),
  ]);

  const r = robloxRes.data;
  // A row with only an error (never synced successfully) has no numbers yet.
  const hasRobloxNumbers = r && r.visits !== null;
  const likes = num(r?.up_votes);
  const dislikes = num(r?.down_votes);

  const dev = devRes.data as { username: string; display_name: string | null } | null;
  const starCount = num(statsRes.data?.rating_count);

  return {
    id: game.id,
    title: game.title,
    // Gamesprout's description, or the game's Roblox one for imported games.
    description: game.description ?? r?.description ?? null,
    thumbnailUrl: game.thumbnail_url ?? r?.icon_url ?? null,
    madeBy:
      (hasRobloxNumbers ? r?.creator_name : null) ??
      dev?.display_name ??
      dev?.username ??
      null,
    tags: ((tagsRes.data ?? []) as unknown as { tags: { name: string } | null }[])
      .map((t) => t.tags?.name)
      .filter((n): n is string => !!n),
    avgStars:
      starCount > 0 && statsRes.data?.avg_rating != null
        ? Number(statsRes.data.avg_rating)
        : null,
    starCount,
    roblox: hasRobloxNumbers
      ? {
          visits: num(r.visits),
          playing: num(r.playing),
          favorites: num(r.favorites),
          likes,
          dislikes,
          likePct:
            likes + dislikes > 0
              ? Math.round((100 * likes) / (likes + dislikes))
              : null,
          iconUrl: r.icon_url,
          screenshotUrls: (r.screenshot_urls as string[] | null) ?? [],
          updatedOnRoblox: r.roblox_updated_at,
          syncedAt: r.synced_at,
          syncError: r.sync_error,
        }
      : null,
  };
}
