"use client";

/* eslint-disable @next/next/no-img-element -- small static SVG icons */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  disconnectRoblox,
  reviewSubmission,
  submitGame,
  verifyGame,
  type GamePreview,
} from "@/app/protected/developer/actions";
import { cn } from "@/lib/utils";

// The Developer page, from the Figma "Developer page" and "Developer page -
// connect Roblox" frames.

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const PANEL = "rounded-[16px] border border-white/10 bg-white/[0.07]";
const FIELD = "rounded-[12px] border border-white/10 bg-black/40";
const YELLOW_BUTTON =
  "w-full rounded-[16px] bg-[#ffcc00] px-4 py-[13px] text-base font-extrabold text-black transition hover:bg-[#ffd84d] disabled:cursor-not-allowed disabled:opacity-60";

export function SectionHeading({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-[16px] bg-[#4d62db] px-3 py-1 font-bold">
      <h2 className="text-base">{title}</h2>
      {right !== undefined && <span className="text-[13px]">{right}</span>}
    </div>
  );
}

// Shown until the person links their Roblox account.
export function ConnectRoblox({ available, message }: { available: boolean; message: string | null }) {
  return (
    <div className="flex flex-col gap-4">
      {message && (
        <p role="alert" className="rounded-[16px] bg-red-950/70 px-3 py-2 text-[13px] font-semibold text-red-100">
          {message}
        </p>
      )}
      <div className={cn(PANEL, "flex flex-col items-center gap-2.5 px-5 py-[22px] text-center")}>
        <span className="rounded-[28px] bg-[#4d62db] p-3.5">
          <img src="/icons/connect-link.svg" alt="" width={28} height={28} className="h-7 w-7" />
        </span>
        <h2 className="text-xl font-extrabold">Connect your Roblox account</h2>
        <p className="text-[13px] font-semibold text-white/60">
          Only Roblox developers can submit games to Gamesprout. Connect your account so we can
          confirm you own the game.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <SectionHeading title="What we access" right="Read-only" />
        <ul className={cn(PANEL, "flex flex-col gap-2.5 p-3.5")}>
          {[
            "Your Roblox username",
            "The games you own or manage",
            "Nothing else — we can’t change anything on your account",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-[13px] font-semibold">
              <img src="/icons/dev-check.svg" alt="" width={16} height={16} className="h-4 w-4 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      {available ? (
        // A normal link (not client navigation): it leaves for roblox.com.
        <a href="/api/roblox/connect" className={cn(YELLOW_BUTTON, "text-center")}>
          Connect Roblox account
        </a>
      ) : (
        <>
          <button type="button" disabled className={YELLOW_BUTTON}>
            Connect Roblox account
          </button>
          <p className="text-center text-[13px] font-semibold text-white/60">
            Roblox sign-in isn&apos;t switched on for Gamesprout yet. Check back soon!
          </p>
        </>
      )}
    </div>
  );
}

// The "connected" pill next to the page title.
export function ConnectedBadge({ username }: { username: string }) {
  return (
    <span
      className={cn(PANEL, "flex shrink-0 items-center gap-1.5 rounded-[20px] px-3 py-[5px] text-[13px] font-bold")}
      title={`Connected to Roblox as @${username}`}
    >
      <img src="/icons/status-dot.svg" alt="" width={6} height={6} className="h-1.5 w-1.5" />
      {username}
    </span>
  );
}

export function AddGameForm({ tags, username }: { tags: string[]; username: string }) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [preview, setPreview] = useState<GamePreview | null>(null);
  const [description, setDescription] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [verifying, startVerify] = useTransition();
  const [submitting, startSubmit] = useTransition();

  const verify = () =>
    startVerify(async () => {
      setError(null);
      setPreview(null);
      const res = await verifyGame(link);
      if (res.ok) setPreview(res.data);
      else setError(res.error);
    });

  const toggleTag = (t: string) =>
    setPicked((list) =>
      list.includes(t) ? list.filter((x) => x !== t) : list.length < 3 ? [...list, t] : list,
    );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startSubmit(async () => {
      setError(null);
      const res = await submitGame({ link, description, tags: picked, email, agreed });
      if (!res.ok) return setError(res.error);
      setDone(res.data.gameId);
      setLink("");
      setPreview(null);
      setDescription("");
      setPicked([]);
      setAgreed(false);
      router.refresh();
    });
  };

  const canSubmit =
    preview?.ownerVerified && !preview.existingGameId && description.trim() && email.trim() && agreed;

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5">
      {done && (
        <p role="status" className="rounded-[16px] border border-[#4d62db]/85 bg-[#4d62db]/20 px-3.5 py-2 text-[13px] font-semibold">
          Submitted! We&apos;ll review it soon.{" "}
          <Link href={`/games/${done}`} className="font-bold text-[#ffcc00] underline">
            Preview your game page
          </Link>
        </p>
      )}

      <section className="flex flex-col gap-2">
        <SectionHeading title="Roblox game link" right="Required" />
        <div className={cn(PANEL, "flex flex-col gap-2 p-3")}>
          <div className={cn(FIELD, "flex items-center gap-2 py-2 pl-3 pr-2 focus-within:border-[#ffcc00]")}>
            <img src="/icons/dev-link.svg" alt="" width={20} height={20} className="h-5 w-5 shrink-0" />
            <input
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setPreview(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  verify();
                }
              }}
              placeholder="roblox.com/games/123456789/Your-Game"
              aria-label="Roblox game link"
              required
              className="min-w-0 flex-1 truncate bg-transparent text-[13px] font-semibold text-white outline-none placeholder:text-white/40"
            />
            <button
              type="button"
              onClick={verify}
              disabled={!link.trim() || verifying}
              className="shrink-0 rounded-[10px] bg-[#ffcc00] px-3 py-1.5 text-[13px] font-extrabold text-black transition hover:bg-[#ffd84d] disabled:opacity-60"
            >
              {verifying ? "Checking…" : "Verify"}
            </button>
          </div>
          {preview && (
            <div className="flex items-center gap-2" aria-live="polite">
              {preview.ownerVerified && !preview.existingGameId && (
                <img src="/icons/dev-check.svg" alt="" width={16} height={16} className="h-4 w-4 shrink-0" />
              )}
              <div className="min-w-0 text-[13px]">
                <p className="truncate font-extrabold">
                  {preview.name}
                  {preview.creator && ` · ${preview.creator}`}
                </p>
                <p className={cn("font-semibold", preview.ownerVerified && !preview.existingGameId ? "text-white/60" : "text-red-300")}>
                  {preview.existingGameId
                    ? "This game is already on Gamesprout"
                    : preview.ownerVerified
                      ? [
                          "Owner verified",
                          preview.ratingPct === null ? null : `${preview.ratingPct}% Rating`,
                          `${compact.format(preview.playing)} playing`,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : `Not owned by @${username} on Roblox`}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeading title="Description" right={`${description.length} / 300`} />
        <div className={cn(PANEL, "p-3")}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 300))}
            maxLength={300}
            rows={4}
            required
            aria-label="Description"
            placeholder="What makes your game fun? Tell players in a sentence or two."
            className={cn(FIELD, "block w-full resize-none p-3 text-[13px] font-semibold text-white outline-none placeholder:text-white/40 focus:border-[#ffcc00]")}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeading title="Genre tags" right="Pick up to 3" />
        <div className={cn(PANEL, "flex flex-wrap gap-2 p-3")}>
          {tags.length === 0 ? (
            <p className="text-[13px] text-white/60">No tags yet.</p>
          ) : (
            tags.map((t) => {
              const on = picked.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleTag(t)}
                  disabled={!on && picked.length >= 3}
                  className={cn(
                    "rounded-[20px] px-3.5 py-[5px] text-[13px] font-bold transition disabled:opacity-40",
                    on ? "bg-[#4d62db] text-white" : "bg-white/20 text-white/60 hover:text-white",
                  )}
                >
                  {t}
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeading title="Contact email" right="Required" />
        <div className={cn(PANEL, "p-3")}>
          <label className={cn(FIELD, "flex items-center gap-2 px-3 py-3.5 focus-within:border-[#ffcc00]")}>
            <img src="/icons/dev-mail.svg" alt="" width={20} height={20} className="h-5 w-5 shrink-0" />
            <span className="sr-only">Contact email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@yourstudio.com"
              className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-white outline-none placeholder:text-white/40"
            />
          </label>
        </div>
      </section>

      <label className="flex cursor-pointer items-center gap-2.5 py-1 text-[13px] font-semibold text-white/60">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            "grid h-5 w-5 shrink-0 place-items-center rounded-[6px] p-[3px] peer-focus-visible:ring-2 peer-focus-visible:ring-white",
            agreed ? "bg-[#ffcc00]" : "border-2 border-white/40",
          )}
        >
          {agreed && <img src="/icons/checkbox-check.svg" alt="" width={14} height={14} className="h-3.5 w-3.5" />}
        </span>
        I agree to the Terms and developer guidelines.
      </label>

      {error && (
        <p role="alert" className="rounded-[16px] bg-red-950/70 px-3 py-2 text-[13px] font-semibold text-red-100">
          {error}
        </p>
      )}
      <button type="submit" disabled={!canSubmit || submitting} className={YELLOW_BUTTON}>
        {submitting ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}

export function DisconnectButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex flex-col items-center gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await disconnectRoblox();
            if (!res.ok) setError(res.error);
            else router.refresh();
          })
        }
        className="text-[13px] font-bold text-white/60 underline-offset-2 hover:text-white hover:underline"
      >
        {pending ? "Disconnecting…" : "Disconnect Roblox account"}
      </button>
      {error && <span role="alert" className="text-xs text-red-300">{error}</span>}
    </span>
  );
}

export function ReviewButtons({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const review = (approve: boolean) =>
    start(async () => {
      const res = await reviewSubmission(gameId, approve);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => review(true)}
        className="rounded-full bg-[#ffcc00] px-3 py-1 text-xs font-extrabold text-black hover:bg-[#ffd84d]"
      >
        Approve
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => review(false)}
        className="rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold hover:bg-white/25"
      >
        Reject
      </button>
      {error && <span role="alert" className="text-xs text-red-300">{error}</span>}
    </span>
  );
}
