import { Heart, Star, ThumbsUp, Users } from "lucide-react";
import {
  GameSpotlight,
  type SpotlightGame,
} from "@/components/home/game-spotlight";
import type { GameDetail } from "@/lib/game-detail";
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

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Star;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-neutral-900 p-3">
      <Icon className="h-5 w-5 shrink-0 text-[#8c9bff]" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs text-neutral-400">{label}</p>
        <p className="truncate font-bold">{value}</p>
      </div>
    </div>
  );
}

function GameInfo({ game }: { game: GameDetail }) {
  const r = game.roblox;
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
      {game.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {game.tags.map((tag, i) => (
            <span
              key={tag}
              className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                i === 0 ? "bg-[#4d62db]" : "bg-neutral-700"
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={ThumbsUp}
          label="Rating on Roblox"
          value={r?.likePct != null ? `${r.likePct}% liked` : "—"}
        />
        <Stat
          icon={Users}
          label="Playing now"
          value={r ? formatCount(r.playing) : "—"}
        />
        <Stat
          icon={Heart}
          label="Favorites"
          value={r ? formatCount(r.favorites) : "—"}
        />
        <Stat
          icon={Star}
          label="Gamesprout rating"
          value={
            game.avgStars != null
              ? `${game.avgStars.toFixed(1)} ★ (${formatCount(game.starCount)})`
              : "No ratings yet"
          }
        />
      </div>

      {game.description && (
        <p className="mt-3 whitespace-pre-line text-sm text-neutral-200">
          {game.description}
        </p>
      )}

      <p className="mt-3 text-xs text-neutral-500">
        {r
          ? `Stats from Roblox, updated ${timeAgo(r.syncedAt)}.`
          : "Roblox stats will appear after the next daily sync."}
      </p>
    </section>
  );
}

export function GameDetailView({ game }: { game: GameDetail }) {
  return (
    <>
      <GameSpotlight game={toSpotlight(game)} />
      <GameInfo game={game} />
    </>
  );
}
