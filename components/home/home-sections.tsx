/* eslint-disable @next/next/no-img-element -- thumbnails and avatars come
   from any host developers use, so we skip next/image's domain list. */
import Link from "next/link";
import { Gamepad2, ThumbsUp } from "lucide-react";
import { PANEL, SectionHeader } from "@/components/home/app-chrome";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/format";
import type { FriendCard, GameCard } from "@/lib/home-data";

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

// --- Computer layout (the Figma desktop prototype) ---------------------------

// Panels on the desktop prototype have a slightly stronger edge and shadow.
export const DESK_PANEL =
  "rounded-[16px] border border-white/[0.12] bg-white/[0.07] shadow-[0_8px_22px_-12px_rgba(0,0,0,0.65)]";

// Plain section heading with a light-blue link (desktop home).
export function DeskSectionHead({
  title,
  href,
  linkLabel = "See All",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <h2 className="truncate text-lg font-black">{title}</h2>
      {href && (
        <Link
          href={href}
          className="shrink-0 text-[13px] font-extrabold text-[#93a4ff] transition hover:text-white"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

// Big game card: wide picture with the genre on it, then name, rating, visits.
export function GameTile({ game }: { game: GameCard }) {
  const art = game.bannerUrl ?? game.thumbnailUrl;
  return (
    <Link
      href={`/games/${game.id}`}
      className="block overflow-hidden rounded-[16px] border border-white/[0.12] bg-white/[0.07] transition hover:-translate-y-0.5 hover:bg-white/[0.11]"
    >
      <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-[#2a41b5] to-[#182359]">
        {art ? (
          <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <Gamepad2 aria-hidden="true" className="absolute inset-0 m-auto h-1/3 w-1/3 text-white/40" />
        )}
        {game.tags[0] && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full border border-white/20 bg-black/65 px-2 py-[3px] text-[11px] font-extrabold">
            {game.tags[0]}
          </span>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="mb-1 truncate text-[15px] font-black">{game.title}</p>
        <p className="flex justify-between gap-2 text-xs font-bold text-white/65">
          <span className="font-extrabold text-[#ffcc00]">
            {game.ratingPct === null ? "No ratings yet" : `${game.ratingPct}% Liked`}
          </span>
          <span>
            {formatCount(game.views)} {game.viewsLabel}
          </span>
        </p>
      </div>
    </Link>
  );
}

// Numbered row (Popular Now on the desktop home, and Charts). Pass what goes
// on the right; it defaults to the visit count.
export function RankRow({
  rank,
  game,
  right,
  size = "desktop",
}: {
  rank: number;
  game: GameCard;
  right?: React.ReactNode;
  size?: "desktop" | "responsive"; // responsive: phone design sizes below lg
}) {
  const phone = size === "responsive";
  return (
    <Link
      href={`/games/${game.id}`}
      className={cn(
        "flex items-center gap-3 border border-white/[0.12] bg-white/[0.07] transition hover:bg-white/[0.11]",
        phone
          ? "rounded-[16px] border-white/10 py-2.5 pl-2.5 pr-3 lg:rounded-[14px] lg:border-white/[0.12] lg:px-3"
          : "rounded-[14px] px-3 py-2.5",
      )}
    >
      <span
        className={cn(
          "shrink-0 text-center font-black",
          phone ? "w-6 text-xl lg:w-[22px] lg:text-base" : "w-[22px] text-base",
          rank <= 3 ? "text-[#ffcc00]" : phone ? "text-white/60 lg:text-white/55" : "text-white/55",
        )}
      >
        {rank}
      </span>
      <Thumbnail game={game} className="h-12 w-12 shrink-0 rounded-[10px]" />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate",
            phone ? "text-base font-extrabold lg:text-sm" : "text-sm font-extrabold",
          )}
        >
          {game.title}
        </span>
        <span
          className={cn(
            "block truncate text-white/65",
            phone ? "text-[13px] font-semibold text-white/60 lg:text-xs lg:font-normal lg:text-white/65" : "text-xs",
          )}
        >
          {[game.tags[0], game.ratingPct === null ? "No ratings" : `${game.ratingPct}% Rating`]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      {right ?? (
        <span className="shrink-0 text-right text-xs font-extrabold">
          {formatCount(game.views)}
          <span className="block text-[11px] font-bold text-white/65">{game.viewsLabel}</span>
        </span>
      )}
    </Link>
  );
}

// Friends as a 3-across grid in a panel (desktop home sidebar).
export function FriendsPanel({ friends, count }: { friends: FriendCard[]; count: number }) {
  return (
    <section>
      <DeskSectionHead title={`Friends (${count})`} href="/protected/friends" linkLabel="View all" />
      <div className={DESK_PANEL}>
        {friends.length === 0 ? (
          <p className="p-4 text-center text-[13px] font-semibold text-white/60">
            No friends yet.{" "}
            <Link href="/protected/friends" className="font-bold text-[#ffcc00] underline">
              Find friends
            </Link>
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2.5 p-3">
            {friends.slice(0, 12).map((f) => (
              <li key={f.id} className="min-w-0">
                <Link
                  href={`/protected/people/${f.username}`}
                  className="flex flex-col items-center gap-1.5 rounded-lg p-1 text-xs font-bold transition hover:bg-white/[0.06]"
                >
                  {f.avatarUrl ? (
                    <img
                      src={f.avatarUrl}
                      alt=""
                      className="h-11 w-11 rounded-full border-2 border-white/20 object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="grid h-11 w-11 place-items-center rounded-full border-2 border-white/20 bg-[#4d62db] text-[15px] font-black uppercase"
                    >
                      {f.username.slice(0, 2)}
                    </span>
                  )}
                  <span className="w-full truncate text-center">{f.displayName ?? f.username}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// The whole desktop home: recommended cards and Popular Now on the left,
// friends on the right.
export function DesktopHome({
  recommended,
  popular,
  friends,
  friendCount,
  asideExtra,
}: {
  recommended: GameCard[];
  popular: GameCard[];
  friends: FriendCard[];
  friendCount: number;
  asideExtra?: React.ReactNode; // shown under Friends (People You May Know)
}) {
  return (
    <div className="hidden grid-cols-12 items-start gap-7 lg:grid">
      <div className="col-span-8">
        <DeskSectionHead title="Recommended for You" href="/protected/search" />
        {recommended.length === 0 ? (
          <EmptyGames />
        ) : (
          <ul className="mb-6 grid grid-cols-2 gap-3">
            {recommended.slice(0, 4).map((g) => (
              <li key={g.id} className="min-w-0">
                <GameTile game={g} />
              </li>
            ))}
          </ul>
        )}
        <DeskSectionHead title="Popular Now" href="/protected/charts" linkLabel="Charts" />
        <ol className="flex flex-col gap-2.5">
          {popular.slice(0, 5).map((g, i) => (
            <li key={g.id}>
              <RankRow rank={i + 1} game={g} />
            </li>
          ))}
        </ol>
      </div>
      <aside className="sticky top-[76px] col-span-4">
        <FriendsPanel friends={friends} count={friendCount} />
        {asideExtra}
      </aside>
    </div>
  );
}
