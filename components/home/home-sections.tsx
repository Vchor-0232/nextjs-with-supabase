/* eslint-disable @next/next/no-img-element -- thumbnails and avatars come
   from any host developers use, so we skip next/image's domain list. */
import Link from "next/link";
import { Gamepad2, ThumbsUp } from "lucide-react";
import { PANEL, SectionHeader } from "@/components/home/app-chrome";
import { cn } from "@/lib/utils";
import {
  formatCount,
  type FriendCard,
  type GameCard,
} from "@/lib/home-data";

// Sizes, colors and spacing follow the Figma "homepage" and "GameSprout
// profile" frames.

export function FriendsSection({
  friends,
  count,
  size = "home",
}: {
  friends: FriendCard[];
  count: number;
  size?: "home" | "profile"; // home: 52px avatars in a row; profile: 44px, evenly spaced
}) {
  return (
    <section className="mb-3">
      <SectionHeader title={`Friends (${count})`} href="/protected/friends" />
      <div
        className={cn(
          PANEL,
          "px-2 py-[7px]",
          size === "profile" && "shadow-[0_6px_18px_rgba(0,0,0,0.25)]",
        )}
      >
        {friends.length === 0 ? (
          <p className="py-4 text-center text-[13px] font-semibold text-white/60">
            No friends yet.{" "}
            <Link href="/protected/friends" className="font-bold text-[#ffcc00] underline">
              Find friends
            </Link>
          </p>
        ) : (
          // A little padding keeps the glowing rings from being clipped.
          <ul
            className={cn(
              "flex p-1",
              size === "home" ? "gap-[22px] overflow-x-auto" : "gap-2",
            )}
          >
            {friends.slice(0, size === "home" ? 12 : 8).map((f, i) => (
              <li
                key={f.id}
                className={cn(
                  size === "home" ? "w-[52px] shrink-0" : "min-w-0 flex-1",
                  // Phones fit 4 on the profile; bigger screens show up to 8.
                  size === "profile" && i >= 4 && "hidden md:block",
                )}
              >
                {/* Tap a friend to see their profile (and message them). */}
                <Link
                  href={`/protected/people/${f.username}`}
                  className={cn(
                    "flex flex-col items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                    size === "home" ? "gap-1" : "gap-0.5",
                  )}
                >
                  <Avatar friend={f} size={size === "home" ? 52 : 44} />
                  <span className="w-full truncate text-center text-[13px] font-bold leading-[18px]">
                    {f.displayName ?? f.username}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// Round avatar with the design's yellow ring and glow.
export function Avatar({ friend, size = 52 }: { friend: FriendCard; size?: 44 | 52 }) {
  const ring = cn(
    "shrink-0 rounded-full border-2 border-[#ffcc00]",
    size === 52
      ? "h-[52px] w-[52px] shadow-[0_0_8px_#ffcc00]"
      : "h-11 w-11 shadow-[0_0_8px_rgba(255,204,0,0.5)]",
  );
  return friend.avatarUrl ? (
    <img src={friend.avatarUrl} alt="" className={`${ring} object-cover`} />
  ) : (
    <span
      aria-hidden="true"
      className={`${ring} grid place-items-center bg-[#4d62db] text-xl font-black uppercase`}
    >
      {friend.username.slice(0, 1)}
    </span>
  );
}

function Thumbnail({ game, className }: { game: GameCard; className: string }) {
  return game.thumbnailUrl ? (
    <img src={game.thumbnailUrl} alt="" className={`${className} object-cover`} />
  ) : (
    <div
      aria-hidden="true"
      className={`${className} grid place-items-center bg-gradient-to-br from-[#4d62db] to-[#1b2470]`}
    >
      <Gamepad2 className="h-1/3 w-1/3 text-white/70" />
    </div>
  );
}

function Rating({ pct, weight = "semibold" }: { pct: number | null; weight?: "semibold" | "bold" }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-[13px] leading-[18px] text-white/60",
        weight === "bold" ? "font-bold" : "font-semibold",
      )}
    >
      <ThumbsUp aria-hidden="true" className="h-4 w-4 shrink-0 fill-[#4d62db] text-[#8c9bff]" />
      {pct === null ? "No ratings yet" : `${pct}% Rating`}
    </span>
  );
}

function EmptyGames({ text = "No games yet. Check back soon!" }: { text?: string }) {
  return (
    <p className={`${PANEL} py-6 text-center text-[13px] font-semibold text-white/60`}>
      {text}
    </p>
  );
}

// One big card: the best-rated game right now.
export function GameOfTheWeekSection({ game }: { game: GameCard | null }) {
  return (
    <section className="mb-1">
      <SectionHeader title="Game of the week" href="/protected/charts" centered />
      {!game ? (
        <EmptyGames />
      ) : (
        <Link
          href={`/games/${game.id}`}
          className={cn(
            PANEL,
            "flex flex-col gap-1.5 overflow-hidden shadow-[0_12px_24px_-10px_rgba(0,0,0,0.4)] transition hover:border-[#4d62db]",
          )}
        >
          <Thumbnail game={game} className="h-[110px] w-full rounded-[10px] md:h-[240px] lg:h-[300px]" />
          <div className="flex min-w-0 flex-col gap-1 pb-1.5 pl-[15px] pr-2">
            <p className="truncate text-base font-extrabold">{game.title}</p>
            <Rating pct={game.ratingPct} />
          </div>
        </Link>
      )}
    </section>
  );
}

export function RecommendedSection({ games }: { games: GameCard[] }) {
  return (
    <GameGridSection title="Recommended For You" href="/protected/charts" games={games} />
  );
}

// Two game cards side by side (Favorite Games on Profile).
export function GameGridSection({
  title,
  href,
  games,
  emptyText,
}: {
  title: string;
  href?: string;
  games: GameCard[];
  emptyText?: string;
}) {
  return (
    <section className="mb-3">
      <SectionHeader title={title} href={href} />
      {games.length === 0 ? (
        <EmptyGames text={emptyText} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {games.map((g) => (
            <li key={g.id} className="min-w-0">
              <Link
                href={`/games/${g.id}`}
                className={cn(PANEL, "block overflow-hidden transition hover:border-[#4d62db]")}
              >
                <Thumbnail game={g} className="h-[90px] w-full rounded-[10px] md:h-[120px]" />
                <div className="flex flex-col gap-0.5 px-2 py-1.5">
                  <p className="truncate text-base font-extrabold leading-[22px]">{g.title}</p>
                  <Rating pct={g.ratingPct} weight="bold" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PopularSection({
  games,
  title = "Popular Now",
  seeAllHref = "/protected/charts",
  listClassName = "md:grid-cols-2",
}: {
  games: GameCard[];
  title?: string;
  seeAllHref?: string | null; // null hides "See All"
  listClassName?: string; // columns on bigger screens
}) {
  return (
    <section className="mb-3">
      <SectionHeader title={title} href={seeAllHref ?? undefined} />
      {games.length === 0 ? (
        <EmptyGames />
      ) : (
        <ul className={cn("grid grid-cols-1 gap-1 md:gap-2", listClassName)}>
          {games.map((g) => (
            <li key={g.id}>
              <Link
                href={`/games/${g.id}`}
                className={cn(
                  PANEL,
                  "flex items-center gap-3 px-2.5 py-2 shadow-[0_6px_18px_rgba(0,0,0,0.25)] transition hover:border-[#4d62db]",
                )}
              >
                <Thumbnail game={g} className="h-16 w-16 shrink-0 rounded-[8px]" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="truncate text-base font-extrabold">{g.title}</p>
                  {g.tags.length > 0 && (
                    <div className="flex gap-1.5 overflow-hidden">
                      {g.tags.slice(0, 2).map((tag, i) => (
                        <span
                          key={tag}
                          className={cn(
                            "shrink-0 rounded-[20px] px-2 py-0.5 text-[13px] font-bold",
                            i === 0 ? "bg-[#4d62db] text-white" : "bg-white/20 text-white/60",
                          )}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <Rating pct={g.ratingPct} />
                </div>
                <span className="shrink-0 text-[13px] font-semibold text-white/60">
                  {formatCount(g.views)}{" "}
                  {g.views === 1 ? g.viewsLabel.slice(0, -1) : g.viewsLabel}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function HomeSkeleton() {
  const block = "animate-pulse rounded-[16px] bg-white/[0.07]";
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div className={`${block} h-28`} />
      <div className={`${block} h-48`} />
      <div className={`${block} h-60`} />
    </div>
  );
}
