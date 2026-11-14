"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Heart, ThumbsDown, ThumbsUp } from "lucide-react";
import { DesignStar, STATS_CELL, STATS_STRIP } from "@/components/home/game-spotlight";
import { useReviewBox } from "@/components/games/reviews";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

type Vote = "like" | "dislike" | null;

function useToast() {
  const [toast, setToast] = useState<{ text: string; login?: boolean } | null>(null);
  const show = (text: string, login = false) => {
    setToast({ text, login });
    window.setTimeout(() => setToast(null), 2500);
  };
  const node = toast && (
    <div
      role="status"
      className="fixed inset-x-0 bottom-24 z-30 lg:bottom-8 mx-auto w-fit max-w-[90vw] rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold shadow-lg ring-1 ring-neutral-700"
    >
      {toast.text}
      {toast.login && (
        <>
          {" "}
          <Link href="/auth/login" className="text-[#ffcc00] underline">
            Log in
          </Link>
        </>
      )}
    </div>
  );
  return { show, node };
}

export function FavoriteButton({
  gameId,
  userId,
  favorited: initial,
}: {
  gameId: string;
  userId: string | null;
  favorited: boolean;
}) {
  const [favorited, setFavorited] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const toggle = async () => {
    if (!userId) return toast.show("Log in to save favorites.", true);
    setBusy(true);
    const next = !favorited;
    setFavorited(next);
    const supabase = createClient();
    const { error } = next
      ? await supabase.from("favorite_games").insert({ game_id: gameId, user_id: userId })
      : await supabase
          .from("favorite_games")
          .delete()
          .eq("game_id", gameId)
          .eq("user_id", userId);
    setBusy(false);
    if (error && error.code !== "23505") {
      setFavorited(!next);
      return toast.show("Couldn't save that. Try again.");
    }
    toast.show(next ? "Added to favorites" : "Removed from favorites");
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={favorited}
        aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        className="grid h-11 w-11 place-items-center rounded-full bg-neutral-900 ring-1 ring-neutral-700 transition hover:bg-neutral-800 disabled:opacity-60"
      >
        <Heart
          className={cn(
            "h-6 w-6",
            favorited ? "fill-[#ffcc00] text-[#ffcc00]" : "text-white",
          )}
        />
      </button>
      {toast.node}
    </>
  );
}

// The blue stats strip from the design, where each part does something:
// tap a star to open the rating box, tap the thumbs to like or dislike.
export function GameStatsBar({
  gameId,
  userId,
  myRating: initialRating,
  myVote: initialVote,
  avgStars,
  starCount,
  visits,
  robloxLikes,
  robloxDislikes,
  gamesproutLikes,
  gamesproutDislikes,
}: {
  gameId: string;
  userId: string | null;
  myRating: number | null;
  myVote: Vote;
  avgStars: number | null;
  starCount: number;
  visits: number | null;
  robloxLikes: number | null;
  robloxDislikes: number | null;
  gamesproutLikes: number;
  gamesproutDislikes: number;
}) {
  const { myRating: rating, open: openReviewBox } = useReviewBox();
  const [vote, setVote] = useState<Vote>(initialVote);
  const [hover, setHover] = useState<number | null>(null);
  const toast = useToast();
  const router = useRouter();

  // Everyone else's votes, so ours can be added back in as it changes.
  const otherLikes = gamesproutLikes - (initialVote === "like" ? 1 : 0);
  const otherDislikes = gamesproutDislikes - (initialVote === "dislike" ? 1 : 0);
  const likes = (robloxLikes ?? 0) + otherLikes + (vote === "like" ? 1 : 0);
  const dislikes = (robloxDislikes ?? 0) + otherDislikes + (vote === "dislike" ? 1 : 0);

  // Average including our rating, updated as soon as we tap.
  const othersTotal = (avgStars ?? 0) * starCount - (initialRating ?? 0);
  const othersCount = starCount - (initialRating ? 1 : 0);
  const count = othersCount + (rating ? 1 : 0);
  const avg = count ? (othersTotal + (rating ?? 0)) / count : null;
  const filled = hover ?? rating ?? (avg === null ? 0 : Math.round(avg));

  const castVote = async (next: Exclude<Vote, null>) => {
    if (!userId) return toast.show("Log in to like or dislike games.", true);
    const previous = vote;
    const updated = vote === next ? null : next; // tap again to undo
    setVote(updated);
    const votes = createClient().from("game_votes");
    // Add a new vote, or flip an existing one. (An upsert would also try to
    // rewrite game_id and user_id, which the table doesn't allow.)
    const { error } =
      updated === null
        ? await votes.delete().eq("game_id", gameId).eq("user_id", userId)
        : previous === null
          ? await votes.insert({ game_id: gameId, user_id: userId, is_like: updated === "like" })
          : await votes
              .update({ is_like: updated === "like" })
              .eq("game_id", gameId)
              .eq("user_id", userId);
    if (error) {
      setVote(previous);
      return toast.show("Couldn't save your vote. Try again.");
    }
    toast.show(
      updated === "like" ? "Liked" : updated === "dislike" ? "Disliked" : "Vote removed",
    );
    router.refresh();
  };

  const voteButton =
    "-my-px min-w-0 rounded-[6px] px-1 py-0.5 transition hover:bg-white/15 aria-pressed:bg-white aria-pressed:text-black";

  return (
    <>
      <div className={STATS_STRIP}>
        <div
          className="flex min-w-0 items-center"
          role="radiogroup"
          aria-label={
            avg === null
              ? "Rate this game (no ratings yet)"
              : `Rate this game. Average ${avg.toFixed(1)} of 5 from ${count} ratings`
          }
          onMouseLeave={() => setHover(null)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
              onClick={() => openReviewBox(n)}
              onMouseEnter={() => setHover(n)}
              className="shrink-0 hover:scale-110"
            >
              <DesignStar lit={n <= filled} />
            </button>
          ))}
          <span className="ml-1 text-[#ffcc00]">{count ? compact.format(count) : "—"}</span>
        </div>
        <span className={STATS_CELL}>Visits: {visits === null ? "—" : compact.format(visits)}</span>
        <span className={STATS_CELL}>
          <button
            type="button"
            aria-pressed={vote === "like"}
            aria-label={`Like (${compact.format(likes)})`}
            onClick={() => castVote("like")}
            className={cn(voteButton, "flex items-center gap-0.5")}
          >
            <ThumbsUp className="h-[15px] w-[15px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
            Likes: {compact.format(likes)}
          </button>
        </span>
        <span className={STATS_CELL}>
          <button
            type="button"
            aria-pressed={vote === "dislike"}
            aria-label={`Dislike (${compact.format(dislikes)})`}
            onClick={() => castVote("dislike")}
            className={cn(voteButton, "flex items-center gap-0.5")}
          >
            <ThumbsDown className="h-[15px] w-[15px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
            {compact.format(dislikes)}
          </button>
        </span>
      </div>
      {toast.node}
    </>
  );
}
