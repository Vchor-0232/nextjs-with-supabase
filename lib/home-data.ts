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
  const [friends, games] = await Promise.all([
    getFriends(userId),
    getGameLists(),
  ]);

  return {
    error: friends.error ?? games.error,
    friendCount: friends.count,
    friends: friends.friends,
    recommended: games.recommended,
    popular: games.popular,
  };
}

// The logged-in user's accepted friends (newest first) and how many there are.
export async function getFriends(userId: string, limit = 12) {
  const supabase = await createClient();
  const res = await supabase
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
    .limit(limit);

  const friends: FriendCard[] = (
    (res.data ?? []) as unknown as {
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
    error: res.error?.message ?? null,
    count: res.count ?? friends.length,
    friends,
  };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Turns game rows into cards with tags, ratings and visit counts.
async function buildGameCards(supabase: Supabase, games: GameRow[]) {
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

  // roblox_stats is optional: the page still works before the sync has run.
  if (robloxRes?.error) {
    console.error("roblox_stats failed to load:", robloxRes.error.message);
  }

  return { cards, error: statsRes?.error ?? tagsRes?.error ?? null };
}

type RankedCard = Awaited<ReturnType<typeof buildGameCards>>["cards"][number];

const toCard = (c: RankedCard): GameCard => ({
  id: c.id,
  title: c.title,
  thumbnailUrl: c.thumbnailUrl,
  robloxUrl: c.robloxUrl,
  views: c.views,
  viewsLabel: c.viewsLabel,
  ratingPct: c.ratingPct,
  tags: c.tags,
});

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

  const { cards, error: cardsError } = await buildGameCards(
    supabase,
    (gamesRes.data ?? []) as GameRow[],
  );

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

  const error = gamesRes.error ?? cardsError;

  return {
    error: error?.message ?? null,
    recommended: recommended.map(toCard),
    popular: popular.map(toCard),
  };
}

export type MyProfile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  roblox_username: string | null;
  created_at: string | null;
};

export async function getMyProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, bio, roblox_username, created_at")
    .eq("id", userId)
    .maybeSingle();
  return data as MyProfile | null;
}

export type Badge = {
  id: string;
  name: string;
  howToEarn: string;
  earned: boolean;
};

// Badges are worked out from what users have done, so there's no badges
// table to keep in sync. Add more here as features ship.
function computeBadges(input: {
  joinedAt: string | null;
  friendCount: number;
  gameViews: number;
}): Badge[] {
  return [
    {
      id: "early-sprout",
      name: "Early Sprout",
      howToEarn: "Joined Gamesprout in 2026",
      earned: input.joinedAt !== null && input.joinedAt < "2027-01-01",
    },
    {
      id: "team-player",
      name: "Team Player",
      howToEarn: "Make your first friend",
      earned: input.friendCount >= 1,
    },
    {
      id: "explorer",
      name: "Explorer",
      howToEarn: "Check out 10 games",
      earned: input.gameViews >= 10,
    },
  ];
}

// Everything the Profile tab shows for the logged-in user.
export async function getProfilePage(userId: string) {
  const supabase = await createClient();

  const [profile, friends, followersRes, followingRes, favoritesRes, viewsRes] =
    await Promise.all([
      getMyProfile(userId),
      getFriends(userId, 8),
      supabase
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", userId),
      supabase
        .from("follows")
        .select("following_id", { count: "exact", head: true })
        .eq("follower_id", userId),
      supabase
        .from("favorite_games")
        .select(
          "created_at, games(id, title, thumbnail_url, roblox_url, created_at, is_published)",
          { count: "exact" },
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(2),
      supabase
        .from("game_views")
        .select("id", { count: "exact", head: true })
        .eq("viewer_id", userId),
    ]);

  const favoriteRows = ((favoritesRes.data ?? []) as unknown as {
    games: (GameRow & { is_published: boolean }) | null;
  }[])
    .map((r) => r.games)
    .filter((g): g is GameRow & { is_published: boolean } => !!g?.is_published);

  const { cards: favoriteCards } = await buildGameCards(supabase, favoriteRows);

  const error =
    friends.error ??
    followersRes.error?.message ??
    followingRes.error?.message ??
    favoritesRes.error?.message ??
    null;

  return {
    error,
    profile,
    friendCount: friends.count,
    friends: friends.friends,
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
    favoriteCount: favoritesRes.count ?? favoriteCards.length,
    favorites: favoriteCards.map(toCard),
    badges: computeBadges({
      joinedAt: profile?.created_at ?? null,
      friendCount: friends.count,
      // game_views may not be readable; then Explorer just stays locked.
      gameViews: viewsRes.error ? 0 : (viewsRes.count ?? 0),
    }),
  };
}

export function formatCount(count: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(count);
}
