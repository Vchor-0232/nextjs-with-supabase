import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Narrow, PageTitle } from "@/components/home/app-chrome";
import {
  AddGameForm,
  ConnectedBadge,
  ConnectRoblox,
  DisconnectButton,
  ReviewButtons,
  SectionHeading,
} from "@/components/developer/developer-ui";
import { robloxOAuthConfig } from "@/lib/roblox-oauth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

// Developers add their own Roblox games here. First they connect their
// Roblox account (so we know which games are theirs), then submit a game;
// it shows on Gamesprout once an admin approves it.

const ERRORS: Record<string, string> = {
  cancelled: "Roblox sign-in was cancelled.",
  expired: "That sign-in took too long or was already used. Please try again.",
  roblox: "Roblox didn't confirm the sign-in. Please try again.",
  taken: "That Roblox account is already connected to another Gamesprout account.",
  server: "Something went wrong saving the connection. Please try again.",
  not_set_up: "Roblox sign-in isn't switched on for Gamesprout yet.",
};

type Submission = {
  game_id: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  contact_email?: string;
  games: { title: string } | null;
};

const STATUS_STYLE = {
  pending: "bg-white/20 text-white/80",
  approved: "bg-[#ffcc00] text-black",
  rejected: "bg-red-950 text-red-200",
};

async function Developer({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/auth/login");
  const me = data.claims.sub;

  const [linkRes, tagsRes, mineRes, profileRes] = await Promise.all([
    supabase
      .from("roblox_accounts")
      .select("roblox_username, roblox_display_name")
      .eq("user_id", me)
      .maybeSingle(),
    supabase.from("tags").select("name").order("name"),
    supabase
      .from("game_submissions")
      .select("game_id, status, submitted_at, games(title)")
      .eq("user_id", me)
      .order("submitted_at", { ascending: false }),
    supabase.from("profiles").select("is_admin").eq("id", me).maybeSingle(),
  ]);

  // The 2026-11-14 database update adds the tables this page uses.
  if (linkRes.error) {
    return (
      <>
        <PageTitle>Add Game</PageTitle>
        <p className="rounded-[16px] border border-[#4d62db]/85 bg-[#4d62db]/20 px-3.5 py-2 text-[13px]">
          The Developer page is almost ready: it needs the latest database update
          (supabase/migrations/20261114000000_charts_search_developers.sql).
        </p>
      </>
    );
  }

  const link = linkRes.data;
  const isAdmin = Boolean(profileRes.data?.is_admin);
  const queueRes = isAdmin
    ? await supabase
        .from("game_submissions")
        .select("game_id, status, submitted_at, contact_email, games(title)")
        .eq("status", "pending")
        .order("submitted_at", { ascending: true })
    : null;
  const mine = (mineRes.data ?? []) as unknown as Submission[];
  const queue = (queueRes?.data ?? []) as unknown as Submission[];

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          // Before connecting, the title sits lower with space around it (design).
          !link && "mt-[72px] mb-[58px] lg:mt-0 lg:mb-2",
        )}
      >
        <PageTitle>Add Game</PageTitle>
        {link && <ConnectedBadge username={link.roblox_username} />}
      </div>

      {!link ? (
        <ConnectRoblox
          available={robloxOAuthConfig() !== null}
          message={query.error ? (ERRORS[query.error] ?? ERRORS.server) : null}
        />
      ) : (
        <>
          {query.connected && (
            <p role="status" className="mb-2.5 rounded-[16px] border border-[#4d62db]/85 bg-[#4d62db]/20 px-3.5 py-2 text-[13px] font-semibold">
              Connected to Roblox as @{link.roblox_username}. Paste a game link and tap Verify.
            </p>
          )}
          <AddGameForm
            tags={(tagsRes.data ?? []).map((t: { name: string }) => t.name)}
            username={link.roblox_username}
          />

          {mine.length > 0 && (
            <section className="mt-6 flex flex-col gap-2">
              <SectionHeading title={`Your games (${mine.length})`} />
              <ul className="flex flex-col gap-2">
                {mine.map((s) => (
                  <li key={s.game_id} className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-white/[0.07] px-3 py-2.5">
                    <Link href={`/games/${s.game_id}`} className="min-w-0 flex-1 truncate text-sm font-extrabold hover:underline">
                      {s.games?.title ?? "Game"}
                    </Link>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-extrabold capitalize", STATUS_STYLE[s.status])}>
                      {s.status === "pending" ? "In review" : s.status}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-6 flex justify-center">
            <DisconnectButton />
          </div>
        </>
      )}

      {isAdmin && (
        <section className="mt-8 flex flex-col gap-2">
          <SectionHeading title={`Review queue (${queue.length})`} right="Admins only" />
          {queue.length === 0 ? (
            <p className="rounded-[16px] border border-white/10 bg-white/[0.07] p-4 text-center text-[13px] text-white/60">
              Nothing waiting for review.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {queue.map((s) => (
                <li key={s.game_id} className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-white/[0.07] px-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <Link href={`/games/${s.game_id}`} className="block truncate text-sm font-extrabold hover:underline">
                      {s.games?.title ?? "Game"}
                    </Link>
                    <span className="block truncate text-xs text-white/60">{s.contact_email}</span>
                  </span>
                  <ReviewButtons gameId={s.game_id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

export default function DeveloperPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  return (
    <Narrow>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[16px] bg-white/[0.07]" />}>
        <Developer searchParams={searchParams} />
      </Suspense>
    </Narrow>
  );
}
