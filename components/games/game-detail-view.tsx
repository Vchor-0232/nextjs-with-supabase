import { FavoriteButton, GameStatsBar } from "@/components/games/game-actions";
import { ExpandableText } from "@/components/games/expandable-text";
import { ReviewProvider, ReviewsSection } from "@/components/games/reviews";
import {
  GameSpotlight,
  type SpotlightGame,
} from "@/components/home/game-spotlight";
import type { GameDetail, Review } from "@/lib/game-detail";
import { formatCount } from "@/lib/home-data";

// The body of a game's Gamesprout page: screenshots, stats bar and details.
// Numbers come from the daily Roblox sync; there's no link out to roblox.com.

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function toSpotlight(game: GameDetail): SpotlightGame {
  const shots = game.roblox?.screenshotUrls ?? [];
  const images = shots.length ? shots : game.thumbnailUrl ? [game.thumbnailUrl] : [];

  return {
    title: game.title,
    developer: game.madeBy ?? "",
    subtitle: game.madeBy ? undefined : "On Gamesprout",
    slides: images.length
      ? images.map((url) => ({
          label: "SCREENSHOT",
          caption: game.title,
          imageUrl: url,
        }))
      : [
          {
            label: "NO SCREENSHOTS YET",
            caption: "They'll appear after the next sync",
          },
        ],
    stats: {
      avgRating: game.avgStars,
      ratingCount: game.starCount || null,
      visits: game.roblox?.visits ?? null,
      likes: game.roblox?.likes ?? null,
      dislikes: game.roblox?.dislikes ?? null,
    },
  };
}

function GameInfo({ game }: { game: GameDetail }) {
  const r = game.roblox;
  const facts = [
    r?.likePct != null && `${r.likePct}% liked on Roblox`,
    r && `${formatCount(r.playing)} playing now`,
    r && `${formatCount(r.favorites)} favorites`,
  ].filter(Boolean);

  return (
    <>
      <section className="mb-3 rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-2.5 shadow-[0_8px_18px_-12px_rgba(0,0,0,0.65)]">
        <h2 className="mb-1 text-base font-bold">Description</h2>
        <ExpandableText
          text={game.description?.trim() || "No description yet."}
          className="whitespace-pre-line text-[13px] leading-relaxed text-white/90"
        />
      </section>

      {game.tags.length > 0 && (
        <ul aria-label="Game categories" className="mb-3 flex flex-wrap gap-[7px] px-1">
          {game.tags.map((tag, i) => (
            <li
              key={tag}
              className={`rounded-full border border-white/20 px-3.5 py-1 text-[13px] font-bold shadow-[0_4px_8px_rgba(0,0,0,0.22)] ${
                i === 0 ? "bg-[#f5c518] text-black" : "bg-[#4d62db]"
              }`}
            >
              {tag}
            </li>
          ))}
        </ul>
      )}

      <p className="mb-3 px-1 text-xs text-neutral-400">
        {facts.length > 0 && <>{facts.join(" · ")}. </>}
        {r
          ? `Stats from Roblox, updated ${timeAgo(r.syncedAt)}.`
          : "Roblox stats will appear after the next daily sync."}
      </p>

      <aside className="mb-3 rounded-2xl border border-[#4d62db]/85 bg-[#4d62db]/20 px-3.5 py-2 text-center text-[13px]">
        Remember to keep comments respectful and to follow our Community Guidelines.
      </aside>
    </>
  );
}

export function GameDetailView({
  game,
  reviews,
}: {
  game: GameDetail;
  reviews: { reviews: Review[]; total: number };
}) {
  return (
    <ReviewProvider
      gameId={game.id}
      gameTitle={game.title}
      userId={game.viewer.userId}
      myRating={game.viewer.rating}
    >
      <GameSpotlight
        game={toSpotlight(game)}
        titleAction={
          <FavoriteButton
            gameId={game.id}
            userId={game.viewer.userId}
            favorited={game.viewer.favorited}
          />
        }
        statsBar={
          <GameStatsBar
            gameId={game.id}
            userId={game.viewer.userId}
            myRating={game.viewer.rating}
            myVote={game.viewer.vote}
            avgStars={game.avgStars}
            starCount={game.starCount}
            visits={game.roblox?.visits ?? null}
            robloxLikes={game.roblox?.likes ?? null}
            robloxDislikes={game.roblox?.dislikes ?? null}
            gamesproutLikes={game.votes.likes}
            gamesproutDislikes={game.votes.dislikes}
          />
        }
      />
      <GameInfo game={game} />
      <ReviewsSection gameId={game.id} reviews={reviews.reviews} total={reviews.total} />
    </ReviewProvider>
  );
}
