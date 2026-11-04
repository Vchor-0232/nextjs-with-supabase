import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MessageCircle } from "lucide-react";
import { PageTitle, SectionHeader } from "@/components/home/app-chrome";
import { FriendButton } from "@/components/social/friend-button";
import { PeopleSearch } from "@/components/social/people-search";
import { PersonAvatar } from "@/components/social/person-avatar";
import { getFriendsPage } from "@/lib/social";
import { createClient } from "@/lib/supabase/server";

const panel = "rounded-2xl border border-neutral-800 bg-neutral-950";

function shortTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function FriendsContent() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const me = auth?.claims?.sub;
  if (!me) redirect("/auth/login");

  const { friends, received, sent, error } = await getFriendsPage(me);

  return (
    <>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-950/70 px-3 py-2 text-sm text-red-100">
          Couldn&apos;t load everything: {error}
        </p>
      )}

      {received.length > 0 && (
        <section className="mb-4">
          <SectionHeader title={`Friend Requests (${received.length})`} />
          <ul className={`${panel} divide-y divide-neutral-800 px-3`}>
            {received.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <Link href={`/protected/people/${p.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <PersonAvatar person={p} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{p.displayName || p.username}</span>
                    <span className="block truncate text-xs text-neutral-400">@{p.username}</span>
                  </span>
                </Link>
                <FriendButton me={me} otherId={p.id} otherName={p.username} relation="received" size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-4">
        <SectionHeader title={`Friends (${friends.length})`} />
        {friends.length === 0 ? (
          <p className={`${panel} px-4 py-6 text-center text-sm text-neutral-400`}>
            No friends yet. Search for people below and send them a request.
          </p>
        ) : (
          <ul className={`${panel} divide-y divide-neutral-800`}>
            {friends.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-3 py-2.5">
                {/* Tap a friend to see their profile... */}
                <Link href={`/protected/people/${f.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="relative">
                    <PersonAvatar person={f} />
                    {f.unread > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#f5c518] px-1 text-[11px] font-extrabold text-black">
                        {f.unread > 9 ? "9+" : f.unread}
                        <span className="sr-only"> unread</span>
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-bold">{f.displayName || f.username}</span>
                      {f.lastMessage && (
                        <span className="shrink-0 text-xs text-neutral-500">{shortTime(f.lastMessage.createdAt)}</span>
                      )}
                    </span>
                    <span
                      className={`block truncate text-sm ${f.unread ? "font-semibold text-white" : "text-neutral-400"}`}
                    >
                      {f.lastMessage
                        ? `${f.lastMessage.fromMe ? "You: " : ""}${f.lastMessage.body}`
                        : `@${f.username}`}
                    </span>
                  </span>
                </Link>
                {/* ...or jump straight into the chat. */}
                <Link
                  href={`/protected/messages/${f.username}`}
                  aria-label={`Message ${f.displayName || f.username}`}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#4d62db] transition hover:bg-[#5d71e5]"
                >
                  <MessageCircle className="h-5 w-5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-4">
        <SectionHeader title="Find Friends" />
        <div className={`${panel} p-3`}>
          <PeopleSearch me={me} />
          {sent.length > 0 && (
            <div className="mt-3 border-t border-neutral-800 pt-3">
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-400">
                Requests you sent
              </h3>
              <ul>
                {sent.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2">
                    <Link href={`/protected/people/${p.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <PersonAvatar person={p} size="sm" />
                      <span className="truncate font-semibold">@{p.username}</span>
                    </Link>
                    <FriendButton me={me} otherId={p.id} otherName={p.username} relation="sent" size="sm" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function FriendsPage() {
  return (
    <>
      <PageTitle>Friends</PageTitle>
      <Suspense
        fallback={
          <div className="flex flex-col gap-4" aria-hidden="true">
            <div className="h-48 animate-pulse rounded-2xl bg-neutral-900" />
            <div className="h-28 animate-pulse rounded-2xl bg-neutral-900" />
          </div>
        }
      >
        <FriendsContent />
      </Suspense>
    </>
  );
}
