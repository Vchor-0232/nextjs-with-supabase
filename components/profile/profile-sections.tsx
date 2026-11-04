/* eslint-disable @next/next/no-img-element -- avatars can come from any host */
import Link from "next/link";
import { Compass, Lock, Pencil, Sprout, Users } from "lucide-react";
import { SectionHeader } from "@/components/home/app-chrome";
import { formatCount, type Badge, type MyProfile } from "@/lib/home-data";
import { cn } from "@/lib/utils";

const panel = "rounded-2xl border border-neutral-800 bg-neutral-950";

export function ProfileCard({
  profile,
  friendCount,
  followers,
  following,
}: {
  profile: MyProfile | null;
  friendCount: number;
  followers: number;
  following: number;
}) {
  const username = profile?.username ?? "player";
  const name = profile?.display_name?.trim() || username;

  return (
    <section className={`${panel} mb-4 p-3`}>
      <div className="flex items-center gap-3">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="h-[72px] w-[72px] shrink-0 rounded-full object-cover ring-[3px] ring-[#f5c518]"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-[#4d62db] text-3xl font-extrabold uppercase ring-[3px] ring-[#f5c518]"
          >
            {username.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{name}</p>
          <p className="truncate text-sm text-neutral-400">@{username}</p>
          {profile?.roblox_username && (
            <p className="truncate text-xs font-semibold text-[#f5c518]">
              Roblox: {profile.roblox_username}
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-neutral-200">
        {profile?.bio?.trim() || (
          <span className="text-neutral-500">No bio yet.</span>
        )}
      </p>

      <dl className="my-3 grid grid-cols-3 divide-x divide-neutral-700 text-center">
        {[
          ["Friends", friendCount],
          ["Followers", followers],
          ["Following", following],
        ].map(([label, value]) => (
          <div key={label}>
            <dd className="text-lg font-bold">{formatCount(Number(value))}</dd>
            <dt className="text-xs text-neutral-400">{label}</dt>
          </div>
        ))}
      </dl>

      <Link
        href="/protected/profile/edit"
        className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#f5c518] font-bold text-black shadow-[0_4px_8px_rgba(0,0,0,0.45)] transition hover:bg-[#ffd633]"
      >
        <Pencil className="h-4 w-4" strokeWidth={2.5} />
        Edit profile
      </Link>
    </section>
  );
}

const BADGE_ICONS: Record<string, typeof Sprout> = {
  "early-sprout": Sprout,
  "team-player": Users,
  explorer: Compass,
};

export function BadgesSection({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <section className="mb-4">
      <SectionHeader title={`Badges (${earned})`} />
      <ul className={`${panel} grid grid-cols-3 gap-1 px-2 py-3`}>
        {badges.map((b) => {
          const Icon = BADGE_ICONS[b.id] ?? Sprout;
          return (
            <li
              key={b.id}
              title={b.earned ? b.name : `Locked: ${b.howToEarn}`}
              className={cn(
                "flex flex-col items-center gap-1 text-center",
                !b.earned && "opacity-45",
              )}
            >
              <span className="relative">
                <Icon
                  className={cn(
                    "h-7 w-7",
                    b.earned ? "text-[#f5c518]" : "text-neutral-400",
                  )}
                  strokeWidth={2}
                />
                {!b.earned && (
                  <Lock className="absolute -bottom-1 -right-2 h-3.5 w-3.5 text-neutral-300" />
                )}
              </span>
              <span className="text-xs font-semibold">{b.name}</span>
              <span className="sr-only">
                {b.earned ? "Earned" : `Locked. ${b.howToEarn}`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
