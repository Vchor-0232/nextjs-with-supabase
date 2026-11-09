import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppChrome } from "@/components/home/app-chrome";
import { GameDetailView } from "@/components/games/game-detail-view";
import { getGameDetail, getGameReviews } from "@/lib/game-detail";
import { createClient } from "@/lib/supabase/server";

// A game's page on Gamesprout. Public, so visitors can tap games too.
async function GamePageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const viewerId = auth?.claims?.sub ?? null;
  const [game, reviews] = await Promise.all([
    getGameDetail(id, viewerId),
    getGameReviews(id),
  ]);
  if (!game) notFound();
  if (reviews.error) console.error("Reviews failed to load:", reviews.error);

  const loggedIn = viewerId !== null;

  return (
    <AppChrome variant={loggedIn ? "app" : "public"} backHref={loggedIn ? "/protected" : "/"}>
      <GameDetailView game={game} reviews={reviews} />
    </AppChrome>
  );
}

export default function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <AppChrome variant="public" backHref="/">
          <div className="flex flex-col gap-3" aria-hidden="true">
            <div className="h-11 w-2/3 animate-pulse rounded-xl bg-white/[0.07]" />
            <div className="h-[215px] animate-pulse rounded-[16px] bg-white/[0.07]" />
            <div className="h-48 animate-pulse rounded-[16px] bg-white/[0.07]" />
          </div>
        </AppChrome>
      }
    >
      <GamePageContent params={params} />
    </Suspense>
  );
}
