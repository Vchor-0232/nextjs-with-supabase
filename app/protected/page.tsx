import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageTitle, SectionDivider } from "@/components/home/app-chrome";
import {
  DesktopHome,
  FriendsSection,
  GameOfTheWeekSection,
  HomeSkeleton,
  PopularSection,
} from "@/components/home/home-sections";
import { PeopleYouMayKnowPanel } from "@/components/social/people-you-may-know";
import { getHomeData } from "@/lib/home-data";
import { getSuggestions } from "@/lib/social";
import { createClient } from "@/lib/supabase/server";

async function HomeContent() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const me = data.claims.sub;
  const [home, suggestions] = await Promise.all([getHomeData(me), getSuggestions(me, 4)]);

  return (
    <>
      {home.error && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-red-950/70 px-3 py-2 text-sm text-red-100"
        >
          Couldn&apos;t load everything: {home.error}
        </p>
      )}
      {/* Phones and tablets: the Figma "homepage" frame. */}
      <div className="lg:hidden">
        <FriendsSection friends={home.friends} count={home.friendCount} />
        <SectionDivider />
        {/* The best-rated game right now (first of the "recommended" list). */}
        <GameOfTheWeekSection game={home.recommended[0] ?? null} />
        <SectionDivider />
        <PopularSection games={home.popular.slice(0, 3)} />
      </div>
      {/* Computers: the Figma desktop prototype. */}
      <DesktopHome
        recommended={home.recommended}
        popular={home.popular}
        friends={home.friends}
        friendCount={home.friendCount}
        asideExtra={<PeopleYouMayKnowPanel me={me} people={suggestions} />}
      />
    </>
  );
}

export default function HomePage() {
  return (
    <>
      <PageTitle>Home</PageTitle>
      <Suspense fallback={<HomeSkeleton />}>
        <HomeContent />
      </Suspense>
    </>
  );
}
