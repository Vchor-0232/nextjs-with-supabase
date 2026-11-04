/* eslint-disable @next/next/no-img-element -- thumbnails and avatars come
   from any host developers use, so we skip next/image's domain list. */
import Link from "next/link";
import { Gamepad2, ThumbsUp } from "lucide-react";
import { SectionHeader } from "@/components/home/app-chrome";
import {
  formatCount,
  type FriendCard,
  type GameCard,
} from "@/lib/home-data";

const panel = "rounded-2xl border border-neutral-800 bg-neutral-950";

export function FriendsSection({
  friends,
  count,
}: {
  friends: FriendCard[];
  count: number;
}) {
  // Matches the Home and Profile designs: "Friends (57)" with avatars.
  return (
    <section className="mb-4">
      <SectionHeader title={`Friends (${count})`} href="/protected/friends" />
      <div className={`${panel} px-2 py-3`}>
        {friends.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-400">
            No friends yet.{" "}
            <Link href="/protected/friends" className="font-semibold text-[#f5c518] underline">
              Find friends
            </Link>
          </p>
        ) : (
          // Padding leaves room for the yellow rings, which the scroll area would clip.
          <ul className="flex gap-3 overflow-x-auto p-1.5">
            {friends.map((f) => (
              <li key={f.id} className="w-14 shrink-0">
                {/* Tap a friend to see their profile (and message them). */}
                <Link
                  href={`/protected/people/${f.username}`}
                  className="flex flex-col items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Avatar friend={f} />
                  <span className="mt-1 w-full truncate text-center text-xs font-semibold">
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

export function Avatar({ friend }: { friend: FriendCard }) {
  const ring = "h-14 w-14 rounded-full ring-[3px] ring-[#f5c518]";
  return friend.avatarUrl ? (
    <img
      src={friend.avatarUrl}
      alt=""
      className={`${ring} object-cover`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`${ring} grid place-items-center bg-[#4d62db] text-xl font-extrabold uppercase`}
    >
      {friend.username.slice(0, 1)}
    </span>
  );
}

function Thumbnail({
  game,
  className,
}: {
  game: GameCard;
  className: string;
}) {
  return game.thumbnailUrl ? (
    <img
      src={game.thumbnailUrl}
      alt=""
      className={`${className} object-cover`}
    />
  ) : (
    <div
      aria-hidden="true"
      className={`${className} grid place-items-center bg-gradient-to-br from-[#4d62db] to-[#1b2470]`}
    >
      <Gamepad2 className="h-1/3 w-1/3 text-white/70" />
    </div>
  );
}

function Rating({ pct }: { pct: number | null }) {
  return (
    <span className="flex items-center gap-1 text-xs text-neutral-300">
      <ThumbsUp className="h-3.5 w-3.5 fill-[#4d62db] text-[#8c9bff]" />
      {pct === null ? "No ratings yet" : `${pct}% Rating`}
    </span>
  );
}

function EmptyGames({ text = "No games yet. Check back soon!" }: { text?: string }) {
  return (
    <p className={`${panel} py-6 text-center text-sm text-neutral-400`}>
      {text}
    </p>
  );
}

export function RecommendedSection({ games }: { games: GameCard[] }) {
  return (
    <GameGridSection
      title="Recommended For You"
      href="/protected/charts"
      games={games}
    />
  );
}

// Two game cards side by side (Recommended, Favorite Games).
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
    <section className="mb-4">
      <SectionHeader title={title} href={href} />
      {games.length === 0 ? (
        <EmptyGames text={emptyText} />
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {games.map((g) => (
            <li key={g.id}>
              <Link
                href={`/games/${g.id}`}
                className="block overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 transition hover:border-[#4d62db]"
              >
                <Thumbnail game={g} className="aspect-[4/3] w-full" />
                <div className="p-2">
                  <p className="truncate text-sm font-bold">{g.title}</p>
                  <Rating pct={g.ratingPct} />
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
}: {
  games: GameCard[];
  title?: string;
  seeAllHref?: string | null; // null hides "See All"
}) {
  return (
    <section className="mb-4">
      <SectionHeader title={title} href={seeAllHref ?? undefined} />
      {games.length === 0 ? (
        <EmptyGames />
      ) : (
        <ul className="flex flex-col gap-2">
          {games.map((g) => (
            <li key={g.id}>
              <Link
                href={`/games/${g.id}`}
                className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-2 transition hover:border-[#4d62db]"
              >
                <Thumbnail game={g} className="h-16 w-16 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{g.title}</p>
                  {g.tags.length > 0 && (
                    <div className="my-1 flex flex-wrap gap-1">
                      {g.tags.slice(0, 2).map((tag, i) => (
                        <span
                          key={tag}
                          className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                            i === 0 ? "bg-[#4d62db]" : "bg-neutral-700"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <Rating pct={g.ratingPct} />
                </div>
                <span className="shrink-0 self-start pt-1 text-xs text-neutral-300">
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
  const block = "animate-pulse rounded-2xl bg-neutral-900";
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div className={`${block} h-28`} />
      <div className={`${block} h-48`} />
      <div className={`${block} h-60`} />
    </div>
  );
}
