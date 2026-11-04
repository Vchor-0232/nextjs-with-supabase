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
  // Gamesprout likes/dislikes (game_votes), added to Roblox's on the page
  votes: { likes: number; dislikes: number };
  // What the person viewing has done; all empty when logged out
  viewer: {
    userId: string | null;
    rating: number | null; // 1–5
    vote: "like" | "dislike" | null;
    favorited: boolean;
  };
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
export async function getGameDetail(
  id: string,
  viewerId: string | null = null,
): Promise<GameDetail | null> {
  // Game IDs are UUIDs; anything else can't exist, so skip the lookup.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const supabase = await createClient();

  const { data: game } = await supabase
    .from("games")
    .select("id, title, description, thumbnail_url, developer_id")
    .eq("id", id)
    .maybeSingle();
  if (!game) return null;

  const none = Promise.resolve({ data: null, error: null });
  const [
    devRes,
    statsRes,
    tagsRes,
    robloxRes,
    likesRes,
    dislikesRes,
    myRatingRes,
    myVoteRes,
    myFavoriteRes,
  ] = await Promise.all([
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
    supabase
      .from("game_votes")
      .select("user_id", { count: "exact", head: true })
      .eq("game_id", id)
      .eq("is_like", true),
    supabase
      .from("game_votes")
      .select("user_id", { count: "exact", head: true })
      .eq("game_id", id)
      .eq("is_like", false),
    viewerId
      ? supabase
          .from("ratings")
          .select("score")
          .eq("game_id", id)
          .eq("user_id", viewerId)
          .maybeSingle()
      : none,
    viewerId
      ? supabase
          .from("game_votes")
          .select("is_like")
          .eq("game_id", id)
          .eq("user_id", viewerId)
          .maybeSingle()
      : none,
    viewerId
      ? supabase
          .from("favorite_games")
          .select("game_id")
          .eq("game_id", id)
          .eq("user_id", viewerId)
          .maybeSingle()
      : none,
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
    votes: { likes: likesRes.count ?? 0, dislikes: dislikesRes.count ?? 0 },
    viewer: {
      userId: viewerId,
      rating: myRatingRes.data ? Number((myRatingRes.data as { score: number }).score) : null,
      vote: myVoteRes.data
        ? (myVoteRes.data as { is_like: boolean }).is_like
          ? "like"
          : "dislike"
        : null,
      favorited: Boolean(myFavoriteRes.data),
    },
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

export type ReviewAuthor = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type Reply = {
  id: string;
  body: string;
  createdAt: string;
  author: ReviewAuthor;
};

export type Review = Reply & {
  rating: number | null; // the writer's current star rating for this game
  replies: Reply[];
};

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  parent_id: string | null;
  author: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

const REVIEWS_SHOWN = 50;

// Reviews (top-level comments) with the writer's rating and their replies,
// newest reviews first and replies oldest first, like a conversation.
export async function getGameReviews(gameId: string) {
  const supabase = await createClient();

  const reviewsRes = await supabase
    .from("comments")
    .select(
      "id, body, created_at, parent_id, author:profiles!comments_user_id_fkey(id, username, display_name, avatar_url)",
      { count: "exact" },
    )
    .eq("game_id", gameId)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(REVIEWS_SHOWN);

  const reviewRows = (reviewsRes.data ?? []) as unknown as CommentRow[];
  const reviewIds = reviewRows.map((r) => r.id);
  const authorIds = [
    ...new Set(reviewRows.map((r) => r.author?.id).filter((id): id is string => !!id)),
  ];

  const [repliesRes, ratingsRes] = await Promise.all([
    reviewIds.length
      ? supabase
          .from("comments")
          .select(
            "id, body, created_at, parent_id, author:profiles!comments_user_id_fkey(id, username, display_name, avatar_url)",
          )
          .in("parent_id", reviewIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    authorIds.length
      ? supabase
          .from("ratings")
          .select("user_id, score")
          .eq("game_id", gameId)
          .in("user_id", authorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const toAuthor = (a: CommentRow["author"]): ReviewAuthor => ({
    id: a?.id ?? "",
    username: a?.username ?? "player",
    displayName: a?.display_name ?? null,
    avatarUrl: a?.avatar_url ?? null,
  });
  const toReply = (c: CommentRow): Reply => ({
    id: c.id,
    body: c.body,
    createdAt: c.created_at,
    author: toAuthor(c.author),
  });

  const ratingByUser = new Map(
    ((ratingsRes.data ?? []) as { user_id: string; score: number }[]).map((r) => [
      r.user_id,
      Number(r.score),
    ]),
  );
  const repliesByReview = new Map<string, Reply[]>();
  for (const c of (repliesRes.data ?? []) as unknown as CommentRow[]) {
    if (!c.parent_id) continue;
    repliesByReview.set(c.parent_id, [...(repliesByReview.get(c.parent_id) ?? []), toReply(c)]);
  }

  return {
    error: reviewsRes.error?.message ?? repliesRes.error?.message ?? null,
    total: reviewsRes.count ?? reviewRows.length,
    reviews: reviewRows.map(
      (c): Review => ({
        ...toReply(c),
        rating: c.author ? (ratingByUser.get(c.author.id) ?? null) : null,
        replies: repliesByReview.get(c.id) ?? [],
      }),
    ),
  };
}
