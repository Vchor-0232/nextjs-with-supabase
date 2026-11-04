"use client";

/* eslint-disable @next/next/no-img-element -- slide images can come from any host */
import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Star,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SpotlightSlide = {
  label: string; // small yellow text, e.g. "CONCEPT ART"
  caption: string; // white text under it
  imageUrl?: string | null;
};

export type SpotlightStats = {
  avgRating: number | null; // 0–5 stars
  ratingCount: number | null;
  visits: number | null;
  likes: number | null;
  dislikes: number | null;
};

export type SpotlightGame = {
  title: string;
  developer: string;
  subtitle?: string; // replaces "Made by …" when set
  slides: SpotlightSlide[];
  stats: SpotlightStats;
};

// Shown until a real game is featured. To feature one, pass a game read
// from the spotlights table instead.
export const PLACEHOLDER_SPOTLIGHT: SpotlightGame = {
  title: "Game Spotlight",
  developer: "",
  subtitle: "Featured games are coming soon",
  slides: [
    { label: "CONCEPT ART", caption: "A featured game's art goes here" },
    { label: "GAMEPLAY", caption: "Screenshots from the game" },
    { label: "DEVELOPERS", caption: "Your game could be next" },
  ],
  stats: {
    avgRating: null,
    ratingCount: null,
    visits: null,
    likes: null,
    dislikes: null,
  },
};

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const show = (n: number | null) => (n === null ? "—" : compact.format(n));

const AUTO_ADVANCE_MS = 5000;

export function GameSpotlight({
  game,
  titleAction,
  statsBar,
}: {
  game: SpotlightGame;
  titleAction?: ReactNode; // e.g. a favorite button next to the title
  statsBar?: ReactNode; // replaces the read-only stats bar
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = game.slides.length;
  const slide = game.slides[index];
  const go = (step: number) => setIndex((i) => (i + step + count) % count);

  // Move to the next image every 5 seconds, like the design. Pauses while
  // the pointer or keyboard focus is on the images, and for people who've
  // asked their device to reduce motion.
  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      AUTO_ADVANCE_MS,
    );
    return () => window.clearInterval(timer);
  }, [paused, count]);

  return (
    <section aria-labelledby="spotlight-title" className="mb-4">
      <div className="flex items-start justify-between gap-2 px-1">
        <h1
          id="spotlight-title"
          className="min-w-0 break-words text-[2.6rem] font-extrabold leading-tight tracking-tight [text-shadow:0_0_10px_#f5c518,2px_2px_0_#4d62db]"
        >
          {game.title}
        </h1>
        {titleAction && <div className="mt-2 shrink-0">{titleAction}</div>}
      </div>
      <p className="mb-2 px-1 text-[15px] font-semibold text-neutral-200">
        {game.subtitle ?? `Made by ${game.developer}`}
      </p>

      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={`${game.title} images`}
        className="relative overflow-hidden rounded-2xl border border-neutral-800"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
      >
        <div
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${count}`}
          className="relative aspect-[16/10] w-full"
        >
          {slide.imageUrl ? (
            <img
              src={slide.imageUrl}
              alt={slide.caption}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className={cn(
                "grid h-full w-full place-items-center bg-gradient-to-br",
                [
                  "from-[#4d62db] via-[#2a2f7a] to-black",
                  "from-[#1b1f4a] via-[#4d62db] to-[#0b0d24]",
                  "from-black via-[#2a2f7a] to-[#84b952]/60",
                ][index % 3],
              )}
            >
              <Gamepad2 className="h-20 w-20 text-white/25" strokeWidth={1.5} />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-8 pt-10 text-right">
            <p className="text-sm font-semibold tracking-[0.2em] text-[#f5c518]">
              {slide.label}
            </p>
            <p className="text-lg font-bold">{slide.caption}</p>
          </div>
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg bg-black/80 transition hover:bg-black"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg bg-black/80 transition hover:bg-black"
            >
              <ChevronRight className="h-6 w-6" strokeWidth={3} />
            </button>
            <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
              {game.slides.map((s, i) => (
                <button
                  key={s.label + i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show image ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-7 bg-[#f5c518]" : "w-5 bg-neutral-400/80",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {statsBar ?? <StatsBar stats={game.stats} />}
    </section>
  );
}

function StatsBar({ stats }: { stats: SpotlightStats }) {
  const filled = stats.avgRating === null ? 0 : Math.round(stats.avgRating);
  const divider = <span aria-hidden="true" className="h-5 w-px bg-white/40" />;

  return (
    <div className="mt-2 flex items-center justify-between gap-1.5 rounded-xl bg-[#4d62db] px-3 py-2 text-[13px] font-bold shadow-[0_3px_8px_rgba(0,0,0,0.45)]">
      <span
        className="flex items-center gap-1.5"
        aria-label={
          stats.avgRating === null
            ? "No ratings yet"
            : `${stats.avgRating.toFixed(1)} out of 5 stars from ${show(stats.ratingCount)} ratings`
        }
      >
        <span className="flex" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={cn(
                "h-4 w-4",
                n <= filled
                  ? "fill-[#f5c518] text-[#f5c518]"
                  : "fill-white/20 text-white/40",
              )}
            />
          ))}
        </span>
        <span aria-hidden="true">{show(stats.ratingCount)}</span>
      </span>
      {divider}
      <span>Visits: {show(stats.visits)}</span>
      {divider}
      <span className="flex items-center gap-1" aria-label={`Likes: ${show(stats.likes)}`}>
        <ThumbsUp className="h-4 w-4" aria-hidden="true" /> {show(stats.likes)}
      </span>
      {divider}
      <span className="flex items-center gap-1" aria-label={`Dislikes: ${show(stats.dislikes)}`}>
        <ThumbsDown className="h-4 w-4" aria-hidden="true" /> {show(stats.dislikes)}
      </span>
    </div>
  );
}
