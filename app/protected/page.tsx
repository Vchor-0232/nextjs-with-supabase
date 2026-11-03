import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageTitle } from "@/components/home/app-chrome";
import {
  FriendsSection,
  HomeSkeleton,
  PopularSection,
  RecommendedSection,
} from "@/components/home/home-sections";
import { getHomeData } from "@/lib/home-data";
import { createClient } from "@/lib/supabase/server";

async function HomeContent() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const home = await getHomeData(data.claims.sub);

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
      <FriendsSection friends={home.friends} count={home.friendCount} />
      <RecommendedSection games={home.recommended} />
      <PopularSection games={home.popular} />
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
