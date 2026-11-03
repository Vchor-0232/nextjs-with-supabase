import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppChrome } from "@/components/home/app-chrome";
import {
  GameSpotlight,
  PLACEHOLDER_SPOTLIGHT,
} from "@/components/home/game-spotlight";
import { PopularSection } from "@/components/home/home-sections";
import { getGameLists } from "@/lib/home-data";
import { createClient } from "@/lib/supabase/server";

// Public home page for visitors who haven't logged in. No Friends or
// Recommended sections, since those need an account.
async function PopularForVisitors() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    // Logged-in users get their own Home page.
    redirect("/protected");
  }

  const { popular, error } = await getGameLists();
  if (error) {
    // Visitors just see "No games yet"; the details go to the server logs.
    console.error("Popular Now failed to load:", error);
  }

  return <PopularSection games={popular} seeAllHref="/auth/sign-up" />;
}

export default function Page() {
  return (
    <AppChrome variant="public">
      <GameSpotlight game={PLACEHOLDER_SPOTLIGHT} />
      <Suspense
        fallback={<div className="h-60 animate-pulse rounded-2xl bg-neutral-900" />}
      >
        <PopularForVisitors />
      </Suspense>
    </AppChrome>
  );
}
