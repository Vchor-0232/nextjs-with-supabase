"use client";

/* eslint-disable @next/next/no-img-element -- small static SVG icons */

import { useMemo, useRef, useState } from "react";
import { GameTile } from "@/components/home/home-sections";
import type { GameListing } from "@/lib/home-data";
import { cn } from "@/lib/utils";

// Search with filters, from the Figma "advanced search" phone frame (blue
// section headings, chips in panels) and the desktop prototype (filters on
// the left, results on the right, updating as you change them).

const PLAYERS = ["Any", "Solo", "2–4", "5–20", "20+"] as const;
const SORTS = ["Popular", "Newest", "Top rated", "Most played"] as const;
type Players = (typeof PLAYERS)[number];
type Sort = (typeof SORTS)[number];

// "Players" is the server size the developer set on Roblox.
function fitsPlayers(max: number | null, players: Players) {
  if (players === "Any") return true;
  if (max === null) return false;
  if (players === "Solo") return max === 1;
  if (players === "2–4") return max >= 2 && max <= 4;
  if (players === "5–20") return max >= 5 && max <= 20;
  return max > 20;
}

export function SearchView({
  games,
  genres,
  initialQuery,
}: {
  games: GameListing[];
  genres: string[];
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [picked, setPicked] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [players, setPlayers] = useState<Players>("Any");
  const [sort, setSort] = useState<Sort>("Popular");
  const results = useRef<HTMLElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = games.filter((g) => {
      if (q && !`${g.title} ${g.creator ?? ""} ${g.tags.join(" ")}`.toLowerCase().includes(q)) {
        return false;
      }
      if (picked.length && !picked.some((t) => g.tags.includes(t))) return false;
      if (minRating > 0 && (g.ratingPct === null || g.ratingPct < minRating)) return false;
      return fitsPlayers(g.maxPlayers, players);
    });
    const by: Record<Sort, (a: GameListing, b: GameListing) => number> = {
      Popular: (a, b) => b.views - a.views,
      Newest: (a, b) => b.addedAt.localeCompare(a.addedAt),
      "Top rated": (a, b) => (b.ratingPct ?? -1) - (a.ratingPct ?? -1) || b.ratingCount - a.ratingCount,
      "Most played": (a, b) => (b.playing ?? -1) - (a.playing ?? -1),
    };
    return [...list].sort(by[sort]);
  }, [games, query, picked, minRating, players, sort]);

  const reset = () => {
    setQuery("");
    setPicked([]);
    setMinRating(0);
    setPlayers("Any");
    setSort("Popular");
  };
  const toggleGenre = (g: string) =>
    setPicked((list) => (list.includes(g) ? list.filter((x) => x !== g) : [...list, g]));

  const showLabel = `Show ${matches.length} ${matches.length === 1 ? "game" : "games"}`;

  const searchBox = (
    <label className="flex items-center gap-2.5 rounded-[16px] border border-white/10 bg-white/[0.07] px-3.5 py-[13px] lg:mb-4 lg:border-white/[0.12] lg:px-4 lg:py-3 lg:shadow-[0_8px_22px_-12px_rgba(0,0,0,0.65)]">
      <img src="/icons/search.svg" alt="" width={20} height={20} className="h-5 w-5 shrink-0 lg:hidden" />
      <span className="sr-only">Search games, creators, tags</span>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search games, creators, tags…"
        className="w-full min-w-0 bg-transparent text-base font-semibold text-white outline-none placeholder:text-white/60 lg:text-sm"
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-12 lg:items-start lg:gap-7">
      <div className="lg:hidden">{searchBox}</div>

      {/* Filters */}
      <aside
        aria-label="Filters"
        className="flex flex-col gap-3 lg:sticky lg:top-[76px] lg:col-span-4 lg:gap-4 lg:rounded-[16px] lg:border lg:border-white/[0.12] lg:bg-white/[0.07] lg:p-4 lg:shadow-[0_8px_22px_-12px_rgba(0,0,0,0.65)]"
      >
        <Filter
          title="Genre"
          right={
            <button type="button" onClick={() => setPicked([])} className="hover:underline lg:text-[#93a4ff] lg:hover:text-white lg:hover:no-underline">
              Clear all →
            </button>
          }
        >
          {genres.length === 0 ? (
            <p className="text-[13px] text-white/60">No genres yet.</p>
          ) : (
            genres.map((g) => (
              <Chip key={g} on={picked.includes(g)} onClick={() => toggleGenre(g)}>
                {g}
              </Chip>
            ))
          )}
        </Filter>

        <Filter
          title="Minimum rating"
          right={<span className="lg:font-black lg:text-[#ffcc00]">{minRating === 0 ? "Any" : `${minRating}%+`}</span>}
          chips={false}
        >
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            aria-label="Minimum rating"
            aria-valuetext={minRating === 0 ? "Any rating" : `${minRating} percent or higher`}
            className="gs-range w-full"
            style={{ ["--fill" as string]: `${minRating}%` }}
          />
          <div className="mt-2 flex justify-between text-[13px] font-semibold text-white/60 lg:text-[11px]">
            {[0, 25, 50, 75, 100].map((n) => (
              <span key={n}>{n}%</span>
            ))}
          </div>
        </Filter>

        <Filter title="Players" right={players}>
          {PLAYERS.map((p) => (
            <Chip key={p} on={players === p} onClick={() => setPlayers(p)}>
              {p}
            </Chip>
          ))}
        </Filter>

        <Filter title="Sort by" right={sort}>
          {SORTS.map((s) => (
            <Chip key={s} on={sort === s} onClick={() => setSort(s)}>
              {s}
            </Chip>
          ))}
        </Filter>

        <div className="flex gap-3 lg:gap-2 lg:border-t lg:border-white/[0.12] lg:pt-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-[16px] border border-white/10 bg-white/[0.07] px-[22px] py-[13px] text-base font-extrabold transition hover:bg-white/[0.12] lg:rounded-full lg:px-4 lg:py-2.5 lg:text-xs"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => results.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="flex-1 rounded-[16px] bg-[#ffcc00] px-4 py-[13px] text-base font-extrabold text-black transition hover:bg-[#ffd84d] lg:rounded-[12px] lg:py-2.5 lg:text-sm lg:font-black"
          >
            {showLabel}
          </button>
        </div>
      </aside>

      <section ref={results} aria-label="Results" className="scroll-mt-20 lg:col-span-8">
        <div className="hidden lg:block">{searchBox}</div>
        <h2 className="mb-2.5 text-lg font-black" aria-live="polite">
          Results ({matches.length})
        </h2>
        {matches.length === 0 ? (
          <p className="rounded-[16px] border border-white/[0.12] bg-white/[0.07] p-6 text-center text-[13px] text-white/65">
            No games match your filters yet.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-3.5">
            {matches.map((g) => (
              <li key={g.id} className="min-w-0">
                <GameTile game={g} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// Phones: blue heading with a panel of chips under it (Figma frame).
// Computers: a plain label with the chips below (desktop prototype).
function Filter({
  title,
  right,
  chips = true,
  children,
}: {
  title: string;
  right: React.ReactNode;
  chips?: boolean;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="contents">
        <span className="flex items-center justify-between rounded-[16px] bg-[#4d62db] px-3 py-1 font-bold lg:mb-0 lg:bg-transparent lg:p-0">
          <span className="text-base lg:text-sm lg:font-extrabold">{title}</span>
          <span className="text-[13px]">{right}</span>
        </span>
      </legend>
      <div
        className={cn(
          "rounded-[16px] border border-white/10 bg-white/[0.07] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0",
          chips ? "flex flex-wrap gap-2 p-3 lg:gap-1.5" : "p-3.5",
        )}
      >
        {children}
      </div>
    </fieldset>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "rounded-[20px] px-3.5 py-[5px] text-[13px] font-bold transition lg:rounded-full lg:border lg:px-[11px] lg:text-xs lg:font-extrabold",
        on
          ? "bg-[#4d62db] text-white lg:border-[#4d62db]"
          : "bg-white/20 text-white/60 hover:text-white lg:border-white/[0.16] lg:bg-white/[0.06] lg:text-white/[0.88]",
      )}
    >
      {children}
    </button>
  );
}
