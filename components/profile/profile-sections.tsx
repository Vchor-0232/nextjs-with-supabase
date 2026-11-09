/* eslint-disable @next/next/no-img-element -- avatars can come from any host */
import Link from "next/link";
import { Compass, Lock, Pencil, Sprout, Users } from "lucide-react";
import { PANEL, SectionHeader } from "@/components/home/app-chrome";
import { formatCount, type Badge, type MyProfile } from "@/lib/home-data";
import { cn } from "@/lib/utils";

// Sizes and colors follow the Figma "GameSprout profile" frame.
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
  const avatar =
    "h-[76px] w-[76px] shrink-0 rounded-full border-2 border-[#ffcc00] shadow-[0_0_8px_rgba(255,204,0,0.5)]";

  return (
    <section className={`${PANEL} mb-3 flex flex-col gap-2 p-3`}>
      <div className="flex items-center gap-3.5">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className={`${avatar} object-cover`} />
        ) : (
          <span
            aria-hidden="true"
            className={`${avatar} grid place-items-center bg-[#4d62db] text-3xl font-black uppercase`}
          >
            {username.slice(0, 1)}
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-[3px]">
          <p className="truncate text-base font-extrabold leading-[22px]">{name}</p>
          <p className="truncate text-[13px] font-bold leading-[18px] text-white/60">@{username}</p>
          {/* The design's yellow status line. We don't track who's online
              yet, so it shows the player's Roblox name when they've added one. */}
          {profile?.roblox_username && (
            <p className="flex items-center gap-[5px] truncate text-[13px] font-bold leading-[18px] text-[#ffcc00]">
              <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ffcc00]" />
              Roblox: {profile.roblox_username}
            </p>
          )}
        </div>
      </div>

      <p className="text-[13px] font-bold leading-[18px]">
        {profile?.bio?.trim() || <span className="text-white/50">No bio yet.</span>}
      </p>

      <dl className="flex h-10 items-center">
        {[
          ["Friends", friendCount],
          ["Followers", followers],
          ["Following", following],
        ].map(([label, value], i) => (
          <div key={label} className="flex flex-1 items-center">
            {i > 0 && <span aria-hidden="true" className="h-7 w-px bg-white/10" />}
            <div className="flex flex-1 flex-col-reverse items-center">
              <dt className="text-[13px] font-bold leading-[18px] text-white/60">{label}</dt>
              <dd className="text-base font-extrabold leading-[22px]">{formatCount(Number(value))}</dd>
            </div>
          </div>
        ))}
      </dl>

      <Link
        href="/protected/profile/edit"
        className="flex h-9 items-center justify-center gap-1.5 rounded-[20px] bg-[#ffcc00] text-base font-extrabold text-black shadow-[0_0_8px_#ffcc00] transition hover:bg-[#ffd84d]"
      >
        <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
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
    <section className="mb-3">
      <SectionHeader title={`Badges (${earned})`} />
      <ul className={`${PANEL} flex gap-2 px-2 py-[5px] shadow-[0_6px_18px_rgba(0,0,0,0.25)]`}>
        {badges.map((b) => {
          const Icon = BADGE_ICONS[b.id] ?? Sprout;
          return (
            <li
              key={b.id}
              title={b.earned ? b.name : `Locked: ${b.howToEarn}`}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-[3px] text-center",
                !b.earned && "opacity-45",
              )}
            >
              <span className="relative">
                <Icon
                  aria-hidden="true"
                  className={cn("h-6 w-6", b.earned ? "text-[#ffcc00]" : "text-white/60")}
                  strokeWidth={2}
                />
                {!b.earned && (
                  <Lock aria-hidden="true" className="absolute -bottom-1 -right-2 h-3.5 w-3.5 text-white/70" />
                )}
              </span>
              <span className="truncate text-[13px] font-bold leading-[18px]">{b.name}</span>
              <span className="sr-only">{b.earned ? "Earned" : `Locked. ${b.howToEarn}`}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
