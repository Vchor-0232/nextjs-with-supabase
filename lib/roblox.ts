// Reads public game info from Roblox's web APIs (no login or API key).
// These are the same endpoints roblox.com uses; Roblox can change them, so
// every call checks its response and reports a readable error.

const BATCH = 50; // Roblox rejects more than 50 universe IDs per request
const PLACE_ID = /roblox\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?games\/(\d+)/i;

export type RobloxGameInfo = {
  placeId: number;
  universeId: number;
  name: string;
  description: string | null;
  creatorName: string | null;
  visits: number;
  playing: number;
  favorites: number;
  upVotes: number;
  downVotes: number;
  iconUrl: string | null;
  screenshotUrls: string[];
  updatedAt: string | null;
};

export type RobloxLookup =
  | { ok: true; info: RobloxGameInfo }
  | { ok: false; placeId: number | null; universeId: number | null; error: string };

// "https://www.roblox.com/games/920587237/Adopt-Me" -> 920587237
export function placeIdFromUrl(url: string): number | null {
  const match = url.match(PLACE_ID);
  return match ? Number(match[1]) : null;
}

async function getJson<T>(url: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    // Too many requests: wait a moment and try once more.
    if (res.status === 429 && attempt === 0) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    if (!res.ok) {
      throw new Error(`Roblox returned ${res.status} for ${new URL(url).pathname}`);
    }
    return (await res.json()) as T;
  }
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// Roblox links point at a "place"; stats live on its "universe".
async function universeForPlace(placeId: number) {
  const data = await getJson<{ universeId: number | null }>(
    `https://apis.roblox.com/universes/v1/places/${placeId}/universe`,
  );
  return data.universeId;
}

/**
 * Looks up Roblox info for each place ID. `knownUniverses` maps place IDs we
 * already resolved, which saves one request per game on later syncs.
 */
export async function fetchRobloxGames(
  placeIds: number[],
  knownUniverses: Map<number, number> = new Map(),
): Promise<Map<number, RobloxLookup>> {
  const results = new Map<number, RobloxLookup>();
  const universeByPlace = new Map<number, number>();

  // 1. Place -> universe, a few at a time to stay polite.
  const unique = [...new Set(placeIds)];
  for (const group of chunk(unique, 5)) {
    await Promise.all(
      group.map(async (placeId) => {
        const known = knownUniverses.get(placeId);
        if (known) {
          universeByPlace.set(placeId, known);
          return;
        }
        try {
          const universeId = await universeForPlace(placeId);
          if (universeId) universeByPlace.set(placeId, universeId);
          else
            results.set(placeId, {
              ok: false,
              placeId,
              universeId: null,
              error: "No Roblox game found for this link",
            });
        } catch (e) {
          results.set(placeId, {
            ok: false,
            placeId,
            universeId: null,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }),
    );
  }

  // 2. Stats, likes, icons and screenshots, 50 universes per request.
  const placeByUniverse = new Map(
    [...universeByPlace].map(([placeId, universeId]) => [universeId, placeId]),
  );

  for (const ids of chunk([...placeByUniverse.keys()], BATCH)) {
    const list = ids.join(",");
    try {
      const [games, votes, icons, shots] = await Promise.all([
        getJson<{ data: GameDetail[] }>(
          `https://games.roblox.com/v1/games?universeIds=${list}`,
        ),
        getJson<{ data: { id: number; upVotes: number; downVotes: number }[] }>(
          `https://games.roblox.com/v1/games/votes?universeIds=${list}`,
        ),
        getJson<{ data: { targetId: number; state: string; imageUrl: string | null }[] }>(
          `https://thumbnails.roblox.com/v1/games/icons?universeIds=${list}&size=512x512&format=Png&isCircular=false`,
        ).catch(() => ({ data: [] })), // images are nice-to-have
        getJson<{
          data: {
            universeId: number;
            thumbnails: { state: string; imageUrl: string | null }[];
          }[];
        }>(
          `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${list}&countPerUniverse=3&size=768x432&format=Png&defaults=false`,
        ).catch(() => ({ data: [] })),
      ]);

      const voteById = new Map(votes.data.map((v) => [v.id, v]));
      const iconById = new Map(
        icons.data
          .filter((i) => i.state === "Completed" && i.imageUrl)
          .map((i) => [i.targetId, i.imageUrl as string]),
      );
      const shotsById = new Map(
        shots.data.map((s) => [
          s.universeId,
          s.thumbnails
            .filter((t) => t.state === "Completed" && t.imageUrl)
            .map((t) => t.imageUrl as string),
        ]),
      );
      const gameById = new Map(games.data.map((g) => [g.id, g]));

      for (const universeId of ids) {
        const placeId = placeByUniverse.get(universeId)!;
        const g = gameById.get(universeId);
        if (!g) {
          results.set(placeId, {
            ok: false,
            placeId,
            universeId,
            error: "Roblox didn't return this game (it may be private or deleted)",
          });
          continue;
        }
        const v = voteById.get(universeId);
        results.set(placeId, {
          ok: true,
          info: {
            placeId,
            universeId,
            name: g.name,
            description: g.description?.slice(0, 2000) || null,
            creatorName: g.creator?.name ?? null,
            visits: g.visits ?? 0,
            playing: g.playing ?? 0,
            favorites: g.favoritedCount ?? 0,
            upVotes: v?.upVotes ?? 0,
            downVotes: v?.downVotes ?? 0,
            iconUrl: iconById.get(universeId) ?? null,
            screenshotUrls: shotsById.get(universeId) ?? [],
            updatedAt: g.updated ?? null,
          },
        });
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      for (const universeId of ids) {
        const placeId = placeByUniverse.get(universeId)!;
        results.set(placeId, { ok: false, placeId, universeId, error });
      }
    }
  }

  return results;
}

type GameDetail = {
  id: number;
  name: string;
  description?: string | null;
  creator?: { name?: string };
  visits?: number;
  playing?: number;
  favoritedCount?: number;
  updated?: string;
};

// --- Finding small Roblox games to import ------------------------------------

export type SmallRobloxGame = {
  universeId: number;
  placeId: number;
  name: string;
  visits: number;
  playing: number;
  genre: string | null;
  keyword: string;
};

type SearchGame = {
  universeId: number;
  rootPlaceId: number;
  name: string;
  playerCount?: number;
  totalUpVotes?: number;
  totalDownVotes?: number;
  isSponsored?: boolean;
  contentMaturity?: string;
};

// Many Gamesprout users are kids, so only import games Roblox rates
// "Minimal" or "Mild". Sponsored (paid) placements are skipped too.
const ALLOWED_MATURITY = new Set(["minimal", "mild"]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Searches Roblox (the same search as roblox.com) for each keyword and keeps
 * games with fewer than `maxVisits` total visits. Roblox's charts only list
 * huge games, so search is the way to find small ones.
 *
 * To skip empty or broken games, a game also needs at least `minVotes`
 * thumbs-up and at least 60% thumbs-up overall.
 */
export async function searchSmallRobloxGames({
  keywords,
  maxVisits,
  minVotes = 10,
  pagesPerKeyword = 2,
  deadline,
}: {
  keywords: string[];
  maxVisits: number;
  minVotes?: number;
  pagesPerKeyword?: number;
  deadline: number; // Date.now() value to stop searching at
}): Promise<{ games: SmallRobloxGame[]; searched: string[]; errors: string[] }> {
  const sessionId = crypto.randomUUID();
  const candidates = new Map<number, SearchGame & { keyword: string }>();
  const searched: string[] = [];
  const errors: string[] = [];

  for (const keyword of keywords) {
    if (Date.now() > deadline) break;
    let pageToken = "";
    for (let page = 0; page < pagesPerKeyword; page++) {
      const url =
        `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(keyword)}` +
        `&sessionId=${sessionId}&pageType=all` +
        (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");
      let data: {
        searchResults?: { contentGroupType?: string; contents?: SearchGame[] }[];
        nextPageToken?: string;
      } | null = null;
      // Search is rate limited. Wait and retry a couple of times, then
      // move on with whatever we've found so far.
      for (let attempt = 0; attempt < 3 && !data && Date.now() < deadline; attempt++) {
        try {
          data = await getJson(url);
        } catch (e) {
          errors.push(`${keyword}: ${e instanceof Error ? e.message : String(e)}`);
          await sleep(5000);
        }
      }
      if (!data) break;
      for (const group of data.searchResults ?? []) {
        if (group.contentGroupType !== "Game") continue;
        for (const g of group.contents ?? []) {
          const up = g.totalUpVotes ?? 0;
          const down = g.totalDownVotes ?? 0;
          if (g.isSponsored || !g.rootPlaceId || candidates.has(g.rootPlaceId)) continue;
          if (!ALLOWED_MATURITY.has((g.contentMaturity ?? "").toLowerCase())) continue;
          if (up < minVotes || up / (up + down) < 0.6) continue;
          candidates.set(g.rootPlaceId, { ...g, keyword });
        }
      }
      pageToken = data.nextPageToken ?? "";
      await sleep(1200); // search is rate limited; go slowly
      if (!pageToken) break;
    }
    searched.push(keyword);
  }

  // Search results don't include visits or genre, so look those up.
  const games: SmallRobloxGame[] = [];
  for (const group of chunk([...candidates.values()], BATCH)) {
    const details = await getJson<{ data: (GameDetail & { genre_l1?: string; genre?: string })[] }>(
      `https://games.roblox.com/v1/games?universeIds=${group.map((g) => g.universeId).join(",")}`,
    );
    const byUniverse = new Map(details.data.map((d) => [d.id, d]));
    for (const g of group) {
      const d = byUniverse.get(g.universeId);
      if (!d || (d.visits ?? Infinity) >= maxVisits) continue;
      const genre = d.genre_l1 || (d.genre && d.genre !== "All" ? d.genre : null);
      games.push({
        universeId: g.universeId,
        placeId: g.rootPlaceId,
        name: g.name,
        visits: d.visits ?? 0,
        playing: d.playing ?? g.playerCount ?? 0,
        genre: genre ?? null,
        keyword: g.keyword,
      });
    }
  }
  return { games, searched, errors };
}
