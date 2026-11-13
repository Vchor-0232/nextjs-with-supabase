"use client";

/* eslint-disable @next/next/no-img-element -- slide images can come from any host */
import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Gamepad2,
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
    <section aria-labelledby="spotlight-title" className="mb-1.5">
      <div className="flex items-start justify-between gap-2">
        <h1
          id="spotlight-title"
          className="min-w-0 break-words text-[40px] font-extrabold leading-[44px] tracking-[-1.5px] [text-shadow:0_0_10px_#ffcc00,2px_2px_0_#4d62db]"
        >
          {game.title}
        </h1>
        {titleAction && <div className="mt-1 shrink-0">{titleAction}</div>}
      </div>
      <p className="mb-1.5 truncate text-base leading-5">
        {game.subtitle ?? `Made by ${game.developer}`}
      </p>

      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={`${game.title} images`}
        className="relative h-[215px] overflow-hidden md:h-[380px] lg:h-[420px] rounded-[16px] border border-white/[0.18] bg-black shadow-[0_12px_24px_-10px_rgba(0,0,0,0.65)]"
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
          className="absolute inset-0"
        >
          {slide.imageUrl ? (
            <img src={slide.imageUrl} alt={slide.caption} className="h-full w-full object-cover" />
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
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/[0.26] to-transparent to-45%" />
          {/* Caption, bottom right, as in the design. */}
          <div className="absolute bottom-[29px] right-3 flex flex-col items-end text-[13px] [text-shadow:0_1px_5px_#000]">
            <span className="tracking-[0.14em] text-[#ffcc00]">{slide.label}</span>
            <strong className="font-bold">{slide.caption}</strong>
          </div>
        </div>

        {count > 1 && (
          <>
            {/* Arrows are tabs attached to the edges of the image. */}
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-0 top-1/2 grid h-[46px] w-[34px] -translate-y-1/2 place-items-center rounded-r-[16px] border border-white/20 bg-black/65 transition hover:bg-[#4d62db]/85"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-0 top-1/2 grid h-[46px] w-[34px] -translate-y-1/2 place-items-center rounded-l-[16px] border border-white/20 bg-black/65 transition hover:bg-[#4d62db]/85"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={3} />
            </button>
            <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
              {game.slides.map((s, i) => (
                <button
                  key={s.label + i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show image ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    "h-[5px] rounded-full transition-all",
                    i === index ? "w-[30px] bg-[#ffcc00]" : "w-5 bg-white/50",
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

// The blue stats strip (stars | visits | likes | dislikes), shared with the
// interactive version on game pages.
export const STATS_STRIP =
  "mt-1.5 grid h-10 grid-cols-[1.35fr_0.95fr_1fr_0.75fr] items-center overflow-hidden whitespace-nowrap rounded-[16px] bg-[#4d62db] px-2 text-[13px] shadow-[0_6px_12px_rgba(0,0,0,0.22)]";
export const STATS_CELL =
  "flex h-[26px] min-w-0 items-center justify-center gap-0.5 border-l border-white/30";

// The design's yellow star (public/icons/star.svg). Unlit stars are dimmed.
export function DesignStar({ lit }: { lit: boolean }) {
  return (
    <img
      src="/icons/star.svg"
      alt=""
      width={18}
      height={23}
      className={cn(
        "relative -top-px h-[23px] w-[18px] transition-transform",
        !lit && "opacity-35 grayscale",
      )}
    />
  );
}

function StatsBar({ stats }: { stats: SpotlightStats }) {
  const filled = stats.avgRating === null ? 0 : Math.round(stats.avgRating);

  return (
    <div className={STATS_STRIP}>
      <span
        className="flex min-w-0 items-center"
        aria-label={
          stats.avgRating === null
            ? "No ratings yet"
            : `${stats.avgRating.toFixed(1)} out of 5 stars from ${show(stats.ratingCount)} ratings`
        }
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <DesignStar key={n} lit={n <= filled} />
        ))}
        <span aria-hidden="true" className="ml-1 text-[#ffcc00]">{show(stats.ratingCount)}</span>
      </span>
      <span className={STATS_CELL}>Visits: {show(stats.visits)}</span>
      <span className={STATS_CELL} aria-label={`Likes: ${show(stats.likes)}`}>
        <ThumbsUp className="h-[15px] w-[15px] shrink-0 text-[#d9d9d9]" strokeWidth={1.6} aria-hidden="true" />
        Likes: {show(stats.likes)}
      </span>
      <span className={STATS_CELL} aria-label={`Dislikes: ${show(stats.dislikes)}`}>
        <ThumbsDown className="h-[15px] w-[15px] shrink-0 text-[#d9d9d9]" strokeWidth={1.6} aria-hidden="true" />
        {show(stats.dislikes)}
      </span>
    </div>
  );
}
