import Link from "next/link";
import { SectionHeader } from "@/components/home/app-chrome";
import { DeskSectionHead, DESK_PANEL } from "@/components/home/home-sections";
import { FriendButton } from "@/components/social/friend-button";
import { PersonAvatar } from "@/components/social/person-avatar";
import { suggestionReason, type Suggestion } from "@/lib/social";
import { cn } from "@/lib/utils";

// "People You May Know": people to add, with why they're suggested and an
// Add button, so nobody has to know a username to find friends.

// Friends page: cards in a sideways-scrolling row on phones, a grid on
// bigger screens.
export function PeopleYouMayKnow({ me, people }: { me: string; people: Suggestion[] }) {
  if (people.length === 0) return null;
  return (
    <section className="mb-4">
      <SectionHeader title="People You May Know" />
      <ul className="-mx-[14px] flex snap-x gap-2.5 overflow-x-auto px-[14px] pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {people.map((p) => (
          <li
            key={p.id}
            className="flex w-[148px] shrink-0 snap-start flex-col items-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.07] p-3 text-center md:w-auto"
          >
            <Link
              href={`/protected/people/${p.username}`}
              className="flex w-full min-w-0 flex-col items-center gap-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <PersonAvatar
                person={p}
                className="h-[52px] w-[52px] border-2 border-[#ffcc00] text-xl shadow-[0_0_8px_rgba(255,204,0,0.5)]"
              />
              <span className="w-full truncate text-[13px] font-bold">{p.displayName || p.username}</span>
              <span className="-mt-1 w-full truncate text-xs font-semibold text-white/60">
                {suggestionReason(p)}
              </span>
            </Link>
            <FriendButton me={me} otherId={p.id} otherName={p.username} relation="none" size="sm" />
          </li>
        ))}
      </ul>
    </section>
  );
}

// Desktop home sidebar: a short list under Friends.
export function PeopleYouMayKnowPanel({ me, people }: { me: string; people: Suggestion[] }) {
  if (people.length === 0) return null;
  return (
    <section className="mt-6">
      <DeskSectionHead title="People You May Know" href="/protected/friends" linkLabel="See more" />
      <ul className={cn(DESK_PANEL, "divide-y divide-white/[0.08] px-3")}>
        {people.slice(0, 4).map((p) => (
          <li key={p.id} className="flex items-center gap-2.5 py-2.5">
            <Link href={`/protected/people/${p.username}`} className="flex min-w-0 flex-1 items-center gap-2.5">
              <PersonAvatar person={p} size="sm" className="border-2 border-white/20" />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-extrabold">{p.displayName || p.username}</span>
                <span className="block truncate text-xs text-white/60">{suggestionReason(p)}</span>
              </span>
            </Link>
            <FriendButton me={me} otherId={p.id} otherName={p.username} relation="none" size="sm" />
          </li>
        ))}
      </ul>
    </section>
  );
}
