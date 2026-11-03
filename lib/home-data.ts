import { createClient } from "@/lib/supabase/server";

export type FriendCard = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type GameCard = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  robloxUrl: string;
  visits: number;
  ratingPct: number | null;
  tags: string[];
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type GameStatsRow = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  roblox_url: string;
  visits: number;
  rating_pct: number | null;
};

const GAME_COLUMNS = "id, title, thumbnail_url, roblox_url, visits, rating_pct";
const PROFILE_COLUMNS = "id, username, display_name, avatar_url";

// Everything the Home page shows, read as the logged-in user (so the
// database's security rules decide what they can see).
export async function getHomeData(userId: string) {
  const supabase = await createClient();

  const [friendsRes, recommendedRes, popularRes] = await Promise.all([
    supabase
      .from("friendships")
      .select(
        `requester_id,
         requester:profiles!friendships_requester_id_fkey(${PROFILE_COLUMNS}),
         addressee:profiles!friendships_addressee_id_fkey(${PROFILE_COLUMNS})`,
        { count: "exact" },
      )
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(12),
    // "Recommended" is the best-rated games for now (newest if nothing is
    // rated yet). It becomes personal once the Interests feature exists.
    supabase
      .from("game_stats")
      .select(GAME_COLUMNS)
      .order("rating_pct", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(2),
    supabase
      .from("game_stats")
      .select(GAME_COLUMNS)
      .order("visits", { ascending: false })
      .limit(3),
  ]);

  const error = friendsRes.error ?? recommendedRes.error ?? popularRes.error;

  const friends: FriendCard[] = (
    (friendsRes.data ?? []) as unknown as {
      requester_id: string;
      requester: ProfileRow;
      addressee: ProfileRow;
    }[]
  ).map((row) => {
    const other = row.requester_id === userId ? row.addressee : row.requester;
    return {
      id: other.id,
      username: other.username,
      displayName: other.display_name,
      avatarUrl: other.avatar_url,
    };
  });

  const recommendedRows = (recommendedRes.data ?? []) as GameStatsRow[];
  const popularRows = (popularRes.data ?? []) as GameStatsRow[];
  const tagsByGame = await getTags(
    supabase,
    [...recommendedRows, ...popularRows].map((g) => g.id),
  );

  const toCard = (g: GameStatsRow): GameCard => ({
    id: g.id,
    title: g.title,
    thumbnailUrl: g.thumbnail_url,
    robloxUrl: g.roblox_url,
    visits: Number(g.visits),
    ratingPct: g.rating_pct,
    tags: tagsByGame.get(g.id) ?? [],
  });

  return {
    error: error?.message ?? null,
    friendCount: friendsRes.count ?? friends.length,
    friends,
    recommended: recommendedRows.map(toCard),
    popular: popularRows.map(toCard),
  };
}

async function getTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  gameIds: string[],
) {
  const tagsByGame = new Map<string, string[]>();
  if (gameIds.length === 0) return tagsByGame;

  const { data } = await supabase
    .from("game_tags")
    .select("game_id, position, tags(name)")
    .in("game_id", [...new Set(gameIds)])
    .order("position");

  for (const row of (data ?? []) as unknown as {
    game_id: string;
    tags: { name: string } | null;
  }[]) {
    if (!row.tags) continue;
    tagsByGame.set(row.game_id, [
      ...(tagsByGame.get(row.game_id) ?? []),
      row.tags.name,
    ]);
  }
  return tagsByGame;
}

export async function getMyProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, bio, roblox_username")
    .eq("id", userId)
    .maybeSingle();
  return data as {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    roblox_username: string | null;
  } | null;
}

export function formatVisits(visits: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(visits);
}
