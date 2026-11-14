import { Suspense } from "react";
import { PageTitle } from "@/components/home/app-chrome";
import { HomeSkeleton } from "@/components/home/home-sections";
import { SearchView } from "@/components/search/search-view";
import { getGameLists } from "@/lib/home-data";

// Search every published game by name, creator or tag, with filters. The
// header's search box sends its text here as ?q=.
async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q ?? "";
  const { all, error } = await getGameLists();

  // Genres to filter by: the tags games actually have, most used first.
  const counts = new Map<string, number>();
  for (const g of all) for (const t of g.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  const genres = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t).slice(0, 12);

  return (
    <>
      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-red-950/70 px-3 py-2 text-sm text-red-100">
          Couldn&apos;t load everything: {error}
        </p>
      )}
      {/* A new search from the header starts fresh. */}
      <SearchView key={q} games={all} genres={genres} initialQuery={q} />
    </>
  );
}

export default function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <>
      <PageTitle>
        {/* "Search" on phones, "Advanced Search" on computers, as designed. */}
        <span className="hidden lg:inline">Advanced </span>Search
      </PageTitle>
      <Suspense fallback={<HomeSkeleton />}>
        <Search searchParams={searchParams} />
      </Suspense>
    </>
  );
}
