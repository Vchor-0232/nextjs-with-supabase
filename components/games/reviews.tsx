"use client";

/* eslint-disable @next/next/no-img-element -- avatars can come from any host */
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SendHorizontal, Star, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Reply, Review } from "@/lib/game-detail";
import { PANEL } from "@/components/home/app-chrome";
import { cn } from "@/lib/utils";

// Reviews combine a star rating (ratings table) with an optional comment
// (comments table). Replies are comments with a parent_id.

const BODY_MAX = 500;

type ReviewBox = {
  userId: string | null;
  myRating: number | null;
  open: (score?: number) => void;
};

const ReviewContext = createContext<ReviewBox | null>(null);

export function useReviewBox() {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error("useReviewBox must be used inside ReviewProvider");
  return ctx;
}

// Wraps the game page so the stars in the stats strip and the "Write a
// review" box open the same rating box.
export function ReviewProvider({
  gameId,
  gameTitle,
  userId,
  myRating: initialRating,
  children,
}: {
  gameId: string;
  gameTitle: string;
  userId: string | null;
  myRating: number | null;
  children: ReactNode;
}) {
  const [myRating, setMyRating] = useState(initialRating);
  const [startScore, setStartScore] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const open = (score?: number) => {
    if (!userId) {
      setNotice("Log in to rate and review games.");
      window.setTimeout(() => setNotice(null), 2500);
      return;
    }
    setStartScore(score ?? myRating);
    setIsOpen(true);
  };

  return (
    <ReviewContext.Provider value={{ userId, myRating, open }}>
      {children}
      {isOpen && userId && (
        <ReviewDialog
          gameId={gameId}
          gameTitle={gameTitle}
          userId={userId}
          startScore={startScore}
          onClose={() => setIsOpen(false)}
          onRated={setMyRating}
        />
      )}
      {notice && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-24 z-30 lg:bottom-8 mx-auto w-fit max-w-[90vw] rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold shadow-lg ring-1 ring-neutral-700"
        >
          {notice}{" "}
          <Link href="/auth/login" className="text-[#ffcc00] underline">
            Log in
          </Link>
        </div>
      )}
    </ReviewContext.Provider>
  );
}

function ReviewDialog({
  gameId,
  gameTitle,
  userId,
  startScore,
  onClose,
  onRated,
}: {
  gameId: string;
  gameTitle: string;
  userId: string;
  startScore: number | null;
  onClose: () => void;
  onRated: (score: number) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [score, setScore] = useState<number | null>(startScore);
  const [hover, setHover] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // A real <dialog> traps focus and closes on Escape for us.
  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!score) return setError("Pick a star rating first.");
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const rated = await supabase
      .from("ratings")
      .upsert(
        { user_id: userId, game_id: gameId, score },
        { onConflict: "user_id,game_id" },
      );
    if (rated.error) {
      setSaving(false);
      // The ratings table doesn't let developers rate their own games.
      return setError(
        rated.error.code === "42501"
          ? "You can't rate your own game."
          : "Couldn't save your rating. Try again.",
      );
    }
    onRated(score);

    const text = body.trim();
    if (text) {
      const posted = await supabase
        .from("comments")
        .insert({ game_id: gameId, user_id: userId, body: text });
      if (posted.error) {
        setSaving(false);
        return setError("Your rating was saved, but the comment didn't post. Try again.");
      }
    }

    router.refresh();
    onClose();
  };

  const shown = hover ?? score ?? 0;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="review-title"
      className="m-auto w-[min(92vw,400px)] rounded-2xl border border-neutral-700 bg-neutral-950 p-0 text-white backdrop:bg-black/70"
    >
      <form onSubmit={submit} className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 id="review-title" className="text-lg font-bold">
            Rate {gameTitle}
          </h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close"
            className="rounded-full p-1 transition hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          role="radiogroup"
          aria-label="Your rating"
          className="flex justify-center gap-1"
          onMouseLeave={() => setHover(null)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={score === n}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              onClick={() => setScore(n)}
              onMouseEnter={() => setHover(n)}
              className="p-1"
            >
              <Star
                className={cn(
                  "h-9 w-9 transition",
                  n <= shown ? "fill-[#ffcc00] text-[#ffcc00]" : "text-neutral-500",
                )}
              />
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="review-body" className="mb-1 block text-sm font-bold">
            Comment <span className="font-normal text-neutral-400">(optional)</span>
          </label>
          <textarea
            id="review-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={BODY_MAX}
            rows={4}
            placeholder="What did you think?"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-[15px] placeholder:text-neutral-500 focus-visible:border-[#4d62db] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4d62db]"
          />
          <p className="mt-1 text-xs text-neutral-400">
            Keep it respectful. {body.length}/{BODY_MAX}
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-950/70 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !score}
          className="h-11 rounded-full bg-[#ffcc00] font-bold text-black transition hover:bg-[#ffd84d] disabled:opacity-50"
        >
          {saving ? "Posting..." : body.trim() ? "Post review" : "Save rating"}
        </button>
      </form>
    </dialog>
  );
}

// "6H", "3D", "NOW" — like the design's "@user · 6H".
function shortAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "NOW";
  if (minutes < 60) return `${minutes}M`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}D`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Avatar({ author, size }: { author: Reply["author"]; size: "sm" | "md" }) {
  // Yellow ring and glow, as on the design's comments.
  const box = cn(
    "shrink-0 rounded-full border-2 border-[#ffcc00] shadow-[0_0_8px_rgba(255,204,0,0.55)]",
    size === "md" ? "h-10 w-10 text-sm" : "h-7 w-7 text-xs",
  );
  return author.avatarUrl ? (
    <img src={author.avatarUrl} alt="" className={`${box} object-cover`} />
  ) : (
    <span
      aria-hidden="true"
      className={`${box} grid place-items-center bg-[#4d62db] font-extrabold uppercase`}
    >
      {author.username.slice(0, 1)}
    </span>
  );
}

function MiniStars({ score }: { score: number }) {
  return (
    <span className="inline-flex" aria-label={`Rated ${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={cn(
            "h-3.5 w-3.5",
            n <= score ? "fill-[#ffcc00] text-[#ffcc00]" : "text-white/30",
          )}
        />
      ))}
    </span>
  );
}

function DeleteButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  return (
    <button
      type="button"
      onClick={async () => {
        if (!window.confirm("Delete this comment?")) return;
        const { error } = await createClient().from("comments").delete().eq("id", id);
        if (!error) onDeleted();
      }}
      className="text-[13px] text-white/50 hover:text-red-300"
    >
      Delete
    </button>
  );
}

function ReviewItem({ review, gameId }: { review: Review; gameId: string }) {
  const { userId } = useReviewBox();
  const router = useRouter();
  const [showReplies, setShowReplies] = useState(false);
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = review.author.displayName ?? review.author.username;
  const count = review.replies.length;

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = reply.trim();
    if (!text || !userId) return;
    setSending(true);
    setError(null);
    const { error } = await createClient()
      .from("comments")
      .insert({ game_id: gameId, user_id: userId, body: text, parent_id: review.id });
    setSending(false);
    if (error) return setError("Couldn't post your reply. Try again.");
    setReply("");
    setReplying(false);
    setShowReplies(true);
    router.refresh();
  };

  return (
    <li className="flex gap-2.5 border-b border-white/10 py-2.5 first:pt-0 last:border-b-0 last:pb-0">
      <Avatar author={review.author} size="md" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] leading-4 text-white/[0.82]">
          <span className="font-bold text-white">@{review.author.username}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={review.createdAt}>{shortAgo(review.createdAt)}</time>
          {review.rating !== null && <MiniStars score={review.rating} />}
        </p>
        {name !== review.author.username && <span className="sr-only">{name}</span>}
        <p className="mt-0.5 whitespace-pre-line break-words text-[13px] leading-[15px]">{review.body}</p>

        <div className="mt-1.5 flex items-center gap-4 text-[13px] font-bold text-white/[0.82]">
          {count > 0 && (
            <button
              type="button"
              onClick={() => setShowReplies((v) => !v)}
              aria-expanded={showReplies}
              className="flex items-center gap-2 hover:text-white"
            >
              <span aria-hidden="true" className="h-px w-[23px] bg-white" />
              {showReplies ? "Hide replies" : `${count} ${count === 1 ? "Reply" : "Replies"}`}
            </button>
          )}
          {userId && (
            <button type="button" onClick={() => setReplying((v) => !v)} className="hover:text-white">
              Reply
            </button>
          )}
          {userId === review.author.id && (
            <DeleteButton id={review.id} onDeleted={() => router.refresh()} />
          )}
        </div>

        {showReplies && count > 0 && (
          <ul className="mt-2 flex flex-col gap-2 border-l-2 border-[#4d62db] pl-3">
            {review.replies.map((r) => (
              <li key={r.id} className="flex gap-2">
                <Avatar author={r.author} size="sm" />
                <div className="min-w-0">
                  <p className="text-[13px] leading-4 text-white/[0.82]">
                    <span className="font-bold text-white">@{r.author.username}</span>{" "}
                    · <time dateTime={r.createdAt}>{shortAgo(r.createdAt)}</time>
                  </p>
                  <p className="whitespace-pre-line break-words text-[13px] leading-[15px]">{r.body}</p>
                  {userId === r.author.id && (
                    <DeleteButton id={r.id} onDeleted={() => router.refresh()} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {replying && (
          <form onSubmit={sendReply} className="mt-2 flex items-center gap-2">
            <label htmlFor={`reply-${review.id}`} className="sr-only">
              Reply to @{review.author.username}
            </label>
            <input
              id={`reply-${review.id}`}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              maxLength={BODY_MAX}
              placeholder={`Reply to @${review.author.username}`}
              autoFocus
              className="h-9 min-w-0 flex-1 rounded-[16px] border-2 border-[#4d62db] bg-white px-3 text-[13px] text-black placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4d62db]"
            />
            <button
              type="submit"
              disabled={sending || !reply.trim()}
              aria-label="Send reply"
              className="grid h-9 w-9 place-items-center rounded-full bg-[#4d62db] transition hover:bg-[#5d71e5] disabled:opacity-50"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          </form>
        )}
        {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
      </div>
    </li>
  );
}

export function ReviewsSection({
  gameId,
  reviews,
  total,
}: {
  gameId: string;
  reviews: Review[];
  total: number;
}) {
  const { open, myRating } = useReviewBox();

  return (
    <section aria-labelledby="reviews-title" className="mb-4">
      <h2 id="reviews-title" className="sr-only">
        Reviews ({total})
      </h2>
      {reviews.length === 0 ? (
        <p className={`${PANEL} py-4 text-center text-[13px] font-semibold text-white/60`}>
          No reviews yet. Be the first to rate it!
        </p>
      ) : (
        <ul className={`${PANEL} p-2.5`}>
          {reviews.map((r) => (
            <ReviewItem key={r.id} review={r} gameId={gameId} />
          ))}
        </ul>
      )}

      {/* Looks like the design's comment box; opens the rating box. */}
      <button
        type="button"
        onClick={() => open()}
        className="mt-2.5 flex h-10 w-full items-center gap-2 rounded-[16px] border-2 border-[#4d62db] bg-white px-3.5 text-left text-[13px] font-semibold text-neutral-500 shadow-[0_0_10px_rgba(77,98,219,0.85)] transition hover:bg-neutral-100"
      >
        <span className="flex-1">
          {myRating ? "Comment...." : "Rate and comment...."}
        </span>
        <SendHorizontal className="h-5 w-5 text-[#4d62db]" aria-hidden="true" />
      </button>
    </section>
  );
}
