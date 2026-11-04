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
  views: number;
  viewsLabel: "Visits" | "Views"; // Roblox visits, or views on Gamesprout
  ratingPct: number | null;
  tags: string[];
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

// Columns of the tables already in Supabase (games, game_stats view).
type GameRow = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  roblox_url: string;
  created_at: string;
};

// Copied from Roblox by the daily sync (see app/api/cron/sync-roblox).
type RobloxStatsRow = {
  game_id: string;
  visits: number | string | null;
  up_votes: number | string | null;
  down_votes: number | string | null;
  icon_url: string | null;
};

type GameStatsRow = {
  game_id: string;
  avg_rating: number | string | null; // 1–5 stars
  rating_count: number | string | null;
  view_count: number | string | null;
};

const PROFILE_COLUMNS = "id, username, display_name, avatar_url";

// How many of the newest published games to rank. Plenty while Gamesprout
// is small; move the ranking into a database view once there are more.
const GAMES_TO_RANK = 100;

// Everything the Home page shows, read as the logged-in user (so the
// database's security rules decide what they can see).
export async function getHomeData(userId: string) {
  const supabase = await createClient();

  const [friendsRes, games] = await Promise.all([
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
    getGameLists(),
  ]);

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

  return {
    error: friendsRes.error?.message ?? games.error,
    friendCount: friendsRes.count ?? friends.length,
    friends,
    recommended: games.recommended,
    popular: games.popular,
  };
}

// Recommended and Popular Now. Also used by the public home page, so it
// only reads what logged-out visitors are allowed to see.
export async function getGameLists() {
  const supabase = await createClient();

  const gamesRes = await supabase
    .from("games")
    .select("id, title, thumbnail_url, roblox_url, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(GAMES_TO_RANK);

  const games = (gamesRes.data ?? []) as GameRow[];
  const ids = games.map((g) => g.id);

  const [statsRes, tagsRes, robloxRes] = ids.length
    ? await Promise.all([
        supabase
          .from("game_stats")
          .select("game_id, avg_rating, rating_count, view_count")
          .in("game_id", ids),
        supabase
          .from("game_tags")
          .select("game_id, tags(name)")
          .in("game_id", ids),
        supabase
          .from("roblox_stats")
          .select("game_id, visits, up_votes, down_votes, icon_url")
          .in("game_id", ids),
      ])
    : [null, null, null];

  const robloxByGame = new Map(
    ((robloxRes?.data ?? []) as RobloxStatsRow[]).map((r) => [r.game_id, r]),
  );

  const statsByGame = new Map(
    ((statsRes?.data ?? []) as GameStatsRow[]).map((s) => [s.game_id, s]),
  );

  const tagsByGame = new Map<string, string[]>();
  for (const row of (tagsRes?.data ?? []) as unknown as {
    game_id: string;
    tags: { name: string } | null;
  }[]) {
    if (!row.tags) continue;
    tagsByGame.set(row.game_id, [
      ...(tagsByGame.get(row.game_id) ?? []),
      row.tags.name,
    ]);
  }

  const cards = games.map((g) => {
    const stats = statsByGame.get(g.id);
    const roblox = robloxByGame.get(g.id);

    // Prefer Roblox's numbers once the sync has them.
    const robloxVisits = roblox?.visits == null ? null : Number(roblox.visits);
    const up = Number(roblox?.up_votes ?? 0);
    const down = Number(roblox?.down_votes ?? 0);
    const robloxLikePct = up + down > 0 ? Math.round((100 * up) / (up + down)) : null;

    // Otherwise Gamesprout's own stars, shown as a percentage: 4.35 of 5 = 87%.
    const starCount = Number(stats?.rating_count ?? 0);
    const avg = stats?.avg_rating == null ? null : Number(stats.avg_rating);
    const starPct =
      avg === null || starCount === 0 ? null : Math.round((avg / 5) * 100);

    return {
      id: g.id,
      title: g.title,
      thumbnailUrl: g.thumbnail_url ?? roblox?.icon_url ?? null,
      robloxUrl: g.roblox_url,
      views: robloxVisits ?? Number(stats?.view_count ?? 0),
      viewsLabel: (robloxVisits === null ? "Views" : "Visits") as GameCard["viewsLabel"],
      ratingPct: robloxLikePct ?? starPct,
      ratingCount: robloxLikePct !== null ? up + down : starCount,
      tags: tagsByGame.get(g.id) ?? [],
      createdAt: g.created_at,
    };
  });

  // "Recommended" is the best-rated games for now (newest first when tied
  // or unrated). It becomes personal once Interests is built.
  const recommended = [...cards]
    .sort(
      (a, b) =>
        (b.ratingPct ?? -1) - (a.ratingPct ?? -1) ||
        b.ratingCount - a.ratingCount ||
        b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, 2);

  const popular = [...cards]
    .sort(
      (a, b) => b.views - a.views || b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, 3);

  const toCard = (c: (typeof cards)[number]): GameCard => ({
    id: c.id,
    title: c.title,
    thumbnailUrl: c.thumbnailUrl,
    robloxUrl: c.robloxUrl,
    views: c.views,
    viewsLabel: c.viewsLabel,
    ratingPct: c.ratingPct,
    tags: c.tags,
  });

  // roblox_stats is optional: the page still works before the sync has run.
  const error = gamesRes.error ?? statsRes?.error ?? tagsRes?.error;
  if (robloxRes?.error) {
    console.error("roblox_stats failed to load:", robloxRes.error.message);
  }

  return {
    error: error?.message ?? null,
    recommended: recommended.map(toCard),
    popular: popular.map(toCard),
  };
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

export function formatCount(count: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(count);
}
