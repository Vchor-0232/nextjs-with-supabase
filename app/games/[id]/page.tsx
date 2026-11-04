import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { AppChrome } from "@/components/home/app-chrome";
import { GameDetailView } from "@/components/games/game-detail-view";
import { getGameDetail } from "@/lib/game-detail";
import { createClient } from "@/lib/supabase/server";

// A game's page on Gamesprout. Public, so visitors can tap games too.
async function GamePageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const viewerId = auth?.claims?.sub ?? null;
  const game = await getGameDetail(id, viewerId);
  if (!game) notFound();

  const loggedIn = viewerId !== null;

  return (
    <AppChrome variant={loggedIn ? "app" : "public"}>
      <Link
        href={loggedIn ? "/protected" : "/"}
        className="mb-2 inline-flex items-center gap-1 px-1 text-sm font-semibold text-neutral-300 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </Link>
      <GameDetailView game={game} />
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
        <AppChrome variant="public">
          <div className="flex flex-col gap-3" aria-hidden="true">
            <div className="h-12 w-2/3 animate-pulse rounded-xl bg-neutral-900" />
            <div className="aspect-[16/10] animate-pulse rounded-2xl bg-neutral-900" />
            <div className="h-48 animate-pulse rounded-2xl bg-neutral-900" />
          </div>
        </AppChrome>
      }
    >
      <GamePageContent params={params} />
    </Suspense>
  );
}
