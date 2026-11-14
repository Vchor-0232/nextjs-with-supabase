import Link from "next/link";
import { Suspense } from "react";
import { PageTitle } from "@/components/home/app-chrome";
import { DESK_PANEL, HomeSkeleton, RankRow } from "@/components/home/home-sections";
import { getCharts, PERIODS, toPeriod, type ChartRow, type Period } from "@/lib/charts";
import { formatCount } from "@/lib/home-data";
import { cn } from "@/lib/utils";

// Charts, from the Figma "Charts" phone frame and the desktop prototype:
// time-range tabs, then every game ranked, with how far it moved since
// yesterday.

const VALUE_LABEL: Record<Period, string> = {
  today: "playing",
  week: "visits this week",
  month: "visits this month",
  all: "visits",
};

function Value({ row, period, hasData }: { row: ChartRow; period: Period; hasData: boolean }) {
  const p = hasData ? period : "all";
  const text =
    row.value === null
      ? "—"
      : `${p === "week" || p === "month" ? "+" : ""}${formatCount(row.value)} ${p === "today" ? "playing" : "visits"}`;
  return (
    <span className="flex shrink-0 flex-col items-end gap-0.5 whitespace-nowrap text-[13px] lg:text-xs">
      <span className="font-semibold text-white/60 lg:font-extrabold lg:text-white">{text}</span>
      {row.change !== null && (
        <span
          className={cn("font-bold", row.change > 0 ? "text-[#ffcc00]" : "text-white/60")}
          aria-label={
            row.change === 0
              ? "Same place as yesterday"
              : `${row.change > 0 ? "Up" : "Down"} ${Math.abs(row.change)} since yesterday`
          }
        >
          {row.change > 0 ? "▲" : row.change < 0 ? "▼" : "–"} {Math.abs(row.change)}
        </span>
      )}
    </span>
  );
}

async function Charts({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const period = toPeriod((await searchParams).period);
  const { rows, error, hasData, total, highestRated } = await getCharts(period);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 lg:mb-4">
        {/* Phones: separate pills. Computers: one tab strip in a panel. */}
        <nav
          aria-label="Time range"
          className="flex w-full gap-2 overflow-x-auto lg:inline-grid lg:w-auto lg:grid-cols-4 lg:gap-1 lg:rounded-[14px] lg:border lg:border-white/[0.12] lg:bg-white/[0.07] lg:p-1"
        >
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/protected/charts?period=${p.key}`}
              replace
              scroll={false}
              aria-current={p.key === period ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-[20px] px-3.5 py-[5px] text-center text-[13px] font-bold transition lg:rounded-[10px] lg:py-[7px] lg:text-xs lg:font-extrabold",
                p.key === period
                  ? "bg-[#4d62db] text-white"
                  : "bg-white/20 text-white/60 hover:text-white lg:bg-transparent lg:text-white/75",
              )}
            >
              {p.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/protected/search"
          className="hidden rounded-full border border-white/[0.16] bg-white/[0.08] px-3 py-1.5 text-xs font-extrabold transition hover:bg-white/[0.14] lg:block"
        >
          Filter by genre &amp; rating →
        </Link>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-red-950/70 px-3 py-2 text-sm text-red-100">
          Couldn&apos;t load everything: {error}
        </p>
      )}
      {!hasData && (
        <p className="mb-3 rounded-[16px] border border-[#4d62db]/85 bg-[#4d62db]/20 px-3.5 py-2 text-[13px]">
          {period === "today" ? "Player counts" : `"${PERIODS.find((p) => p.key === period)!.label}" ranks`}{" "}
          start once the daily update has a few days of numbers. Showing all-time visits for now.
        </p>
      )}

      {/* Computers: three quick numbers. */}
      <div className="mb-[18px] hidden grid-cols-3 gap-3 lg:grid">
        <div className={cn(DESK_PANEL, "px-4 py-3")}>
          <p className="text-[11px] font-extrabold uppercase text-white/65">Ranked games</p>
          <p className="mt-1 text-[22px] font-black">{rows.length}</p>
        </div>
        <div className={cn(DESK_PANEL, "px-4 py-3")}>
          <p className="text-[11px] font-extrabold uppercase text-white/65">
            {hasData && period === "today" ? "Playing now" : hasData ? `Combined ${VALUE_LABEL[period]}` : "Combined visits"}
          </p>
          <p className="mt-1 text-[22px] font-black">{formatCount(total)}</p>
        </div>
        <div className={cn(DESK_PANEL, "min-w-0 px-4 py-3")}>
          <p className="text-[11px] font-extrabold uppercase text-white/65">Highest rated</p>
          <p className="mt-1 truncate text-[22px] font-black">
            {highestRated ? `${highestRated.title} (${highestRated.ratingPct}%)` : "—"}
          </p>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between rounded-[16px] bg-[#4d62db] px-3 py-1 lg:mb-3 lg:rounded-[12px] lg:px-3.5 lg:py-2.5">
        <h2 className="text-base font-bold lg:font-black">Top games</h2>
        <Link href="/protected/search" className="text-[13px] font-bold hover:underline">
          See All →
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className={cn(DESK_PANEL, "py-6 text-center text-[13px] font-semibold text-white/60")}>
          No games yet. Check back soon!
        </p>
      ) : (
        <ol className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-2.5">
          {rows.map((row) => (
            <li key={row.game.id} className="min-w-0">
              <RankRow
                rank={row.rank}
                game={row.game}
                size="responsive"
                right={<Value row={row} period={period} hasData={hasData} />}
              />
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

export default function ChartsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  return (
    <>
      <PageTitle>Charts</PageTitle>
      <Suspense fallback={<HomeSkeleton />}>
        <Charts searchParams={searchParams} />
      </Suspense>
    </>
  );
}
