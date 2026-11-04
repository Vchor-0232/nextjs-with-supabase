import { Suspense } from "react";
import { PageTitle } from "@/components/home/app-chrome";
import { HomeSkeleton, PopularSection } from "@/components/home/home-sections";
import { getGameLists } from "@/lib/home-data";

// Every published game, most visited first. Imported Roblox games and games
// added on Gamesprout both show up here.
async function Charts() {
  const { all, error } = await getGameLists();
  return (
    <>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-red-950/70 px-3 py-2 text-sm text-red-100"
        >
          Couldn&apos;t load everything: {error}
        </p>
      )}
      <PopularSection
        title={`Most Visited (${all.length})`}
        games={all}
        seeAllHref={null}
      />
    </>
  );
}

export default function ChartsPage() {
  return (
    <>
      <PageTitle>Charts</PageTitle>
      <Suspense fallback={<HomeSkeleton />}>
        <Charts />
      </Suspense>
    </>
  );
}
