import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { FriendButton } from "@/components/social/friend-button";
import { PersonAvatar } from "@/components/social/person-avatar";
import { formatCount } from "@/lib/home-data";
import { getPersonPage } from "@/lib/social";
import { createClient } from "@/lib/supabase/server";

// Someone else's profile. Tapping a friend anywhere lands here; the
// Message button opens your chat with them.
async function PersonContent({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const me = auth?.claims?.sub;
  if (!me) redirect("/auth/login");

  const page = await getPersonPage(decodeURIComponent(username), me);
  if (!page) notFound();
  if (page.relation === "self") redirect("/protected/profile");

  const { person } = page;
  const name = person.displayName?.trim() || person.username;
  const stats = [
    ...(page.friendCount !== null ? [["Friends", page.friendCount] as const] : []),
    ["Followers", page.followers] as const,
    ["Following", page.following] as const,
  ];

  return (
    <>
      <Link
        href="/protected/friends"
        className="mb-2 inline-flex items-center gap-1 px-1 text-sm font-semibold text-neutral-300 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Friends
      </Link>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
        <div className="flex items-center gap-4">
          <PersonAvatar person={person} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold [text-shadow:0_0_10px_rgba(255,204,0,0.6)]">
              {name}
            </h1>
            <p className="truncate text-sm text-neutral-400">@{person.username}</p>
            {page.robloxUsername && (
              <p className="truncate text-xs font-semibold text-[#ffcc00]">
                Roblox: {page.robloxUsername}
              </p>
            )}
          </div>
        </div>

        <p className="mt-3 whitespace-pre-line text-sm text-neutral-200">
          {page.bio?.trim() || <span className="text-neutral-500">No bio yet.</span>}
        </p>

        <dl className={`my-4 grid divide-x divide-neutral-700 text-center ${stats.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {stats.map(([label, value]) => (
            <div key={label}>
              <dd className="text-lg font-bold">{formatCount(value)}</dd>
              <dt className="text-xs text-neutral-400">{label}</dt>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-3">
          {page.relation === "friend" ? (
            <Link
              href={`/protected/messages/${person.username}`}
              className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#ffcc00] font-bold text-black shadow-[0_4px_8px_rgba(0,0,0,0.45)] transition hover:bg-[#ffd84d]"
            >
              <MessageCircle className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
              Message
            </Link>
          ) : (
            <p className="rounded-xl bg-neutral-900 px-3 py-2 text-center text-sm text-neutral-400">
              {page.relation === "received"
                ? `@${person.username} wants to be friends. Accept to start chatting.`
                : page.relation === "sent"
                  ? "Request sent. You can chat once they accept."
                  : `Add @${person.username} as a friend to chat.`}
            </p>
          )}
          <FriendButton me={me} otherId={person.id} otherName={person.username} relation={page.relation} />
        </div>
      </section>
    </>
  );
}

export default function PersonPage({ params }: { params: Promise<{ username: string }> }) {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl bg-neutral-900" />}>
      <PersonContent params={params} />
    </Suspense>
  );
}
