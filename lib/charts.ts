import { getGameLists, type GameListing } from "@/lib/home-data";
import { createClient } from "@/lib/supabase/server";

// Charts ranks games for a time range using the daily snapshots the sync
// saves in roblox_stats_daily:
//   Today       players online right now
//   This week   visits gained over the last 7 days
//   This month  visits gained over the last 30 days
//   All time    total visits
// "Moved up/down" compares with the same ranking one day earlier.

export const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "all", label: "All time" },
] as const;
export type Period = (typeof PERIODS)[number]["key"];

export function toPeriod(value: string | string[] | undefined): Period {
  return PERIODS.some((p) => p.key === value) ? (value as Period) : "week";
}

export type ChartRow = {
  game: GameListing;
  rank: number;
  value: number | null; // what the ranking is by (see above)
  change: number | null; // places moved since yesterday (+ = up); null = unknown
};

type Snapshot = { game_id: string; day: string; visits: number | null; playing: number | null };

const DAY = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export async function getCharts(period: Period) {
  const { all, error } = await getGameLists();
  const supabase = await createClient();

  const today = new Date();
  const since = isoDay(new Date(today.getTime() - 32 * DAY));
  // Missing until the 2026-11-14 migration is run; Charts still works.
  const dailyRes = all.length
    ? await supabase
        .from("roblox_stats_daily")
        .select("game_id, day, visits, playing")
        .in("game_id", all.map((g) => g.id))
        .gte("day", since)
        .order("day", { ascending: true })
    : { data: [], error: null };
  const history = new Map<string, Snapshot[]>();
  for (const row of (dailyRes.data ?? []) as Snapshot[]) {
    history.set(row.game_id, [...(history.get(row.game_id) ?? []), row]);
  }

  // The latest snapshot on or before a day.
  const on = (gameId: string, day: string) => {
    const rows = history.get(gameId) ?? [];
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i].day <= day) return rows[i];
    return null;
  };
  const daysAgo = (n: number) => isoDay(new Date(today.getTime() - n * DAY));

  // The ranking value now (offset 0) or as of yesterday (offset 1).
  const valueFor = (g: GameListing, offset: 0 | 1): number | null => {
    const end = offset === 0 ? null : on(g.id, daysAgo(1));
    if (offset === 1 && !end) return null;
    if (period === "all") return offset === 0 ? g.views : Number(end!.visits ?? 0);
    if (period === "today") return offset === 0 ? g.playing : end!.playing;
    const span = period === "week" ? 7 : 30;
    const start = on(g.id, daysAgo(span + offset));
    const endVisits = offset === 0 ? g.views : Number(end!.visits ?? 0);
    if (!start || start.visits == null) return null;
    return Math.max(0, endVisits - Number(start.visits));
  };

  const rank = (offset: 0 | 1) => {
    const scored = all.map((g) => ({ g, v: valueFor(g, offset) }));
    scored.sort(
      (a, b) => (b.v ?? -1) - (a.v ?? -1) || b.g.views - a.g.views,
    );
    return scored;
  };

  const now = rank(0);
  // Weekly and monthly ranks need a week or a month of daily snapshots.
  const hasData = now.some((r) => r.v !== null);
  const before = new Map(
    rank(1)
      .filter((r) => r.v !== null)
      .map((r, i) => [r.g.id, i + 1]),
  );

  const rows: ChartRow[] = (hasData ? now : rank(0).map((r) => ({ ...r, v: r.g.views }))).map(
    (r, i) => {
      const prev = before.get(r.g.id);
      return {
        game: r.g,
        rank: i + 1,
        value: r.v,
        change: hasData && prev !== undefined && r.v !== null ? prev - (i + 1) : null,
      };
    },
  );

  const rated = all.filter((g) => g.ratingPct !== null);
  const highestRated = rated.sort((a, b) => b.ratingPct! - a.ratingPct! || b.ratingCount - a.ratingCount)[0] ?? null;

  return {
    error,
    rows,
    // False when there isn't enough history yet for this range (the list
    // then falls back to total visits).
    hasData,
    total: rows.reduce((sum, r) => sum + (r.value ?? 0), 0),
    highestRated,
  };
}
