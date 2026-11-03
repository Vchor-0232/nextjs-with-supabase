import Link from "next/link";
import { Bell, Gamepad2, Search, Sprout } from "lucide-react";
import { BottomNav } from "@/components/home/bottom-nav";

// The frame around every logged-in page: blue header on top, tab bar at the
// bottom, black in between (from the Figma "homepage" frame).
export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-black text-white">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col">
        <AppHeader />
        <main className="flex-1 px-3 pb-28 pt-4">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}

function AppHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between rounded-b-2xl bg-[#4d62db] px-4 shadow-[0_4px_10px_rgba(0,0,0,0.4)]">
      <Link
        href="/protected"
        className="flex items-center gap-1.5 text-[15px] font-bold"
        aria-label="Gamesprout home"
      >
        <span className="relative inline-flex pt-1.5" aria-hidden="true">
          <Gamepad2 className="h-6 w-6 text-black" strokeWidth={2.5} />
          <Sprout
            className="absolute -top-1 left-1/2 h-4 w-4 -translate-x-1/2 text-[#84b952]"
            strokeWidth={3}
          />
        </span>
        Gamesprout
      </Link>
      <div className="flex items-center gap-3">
        {/* Search and notifications aren't built yet. */}
        <button
          type="button"
          aria-label="Search (coming soon)"
          title="Search is coming soon"
          className="rounded-full p-1 opacity-90 transition hover:bg-white/15"
        >
          <Search className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          aria-label="Notifications (coming soon)"
          title="Notifications are coming soon"
          className="rounded-full p-1 opacity-90 transition hover:bg-white/15"
        >
          <Bell className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>
    </header>
  );
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="mb-4 px-1 text-5xl font-extrabold tracking-tight text-white [text-shadow:0_0_14px_rgba(255,236,160,0.85),0_0_3px_rgba(255,255,255,0.9)]">
      {children}
    </h1>
  );
}

export function SectionHeader({
  title,
  href,
}: {
  title: string;
  href?: string;
}) {
  return (
    <div className="mb-2 flex h-8 items-center justify-between rounded-full bg-[#4d62db] px-3 shadow-[0_3px_8px_rgba(0,0,0,0.45)]">
      <h2 className="text-[15px] font-bold">{title}</h2>
      {href && (
        <Link
          href={href}
          className="text-xs font-bold underline-offset-2 hover:underline"
        >
          See All →
        </Link>
      )}
    </div>
  );
}

export function ComingSoon({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <>
      <PageTitle>{title}</PageTitle>
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-center">
        <p className="font-bold">Coming soon</p>
        <p className="mt-1 text-sm text-neutral-400">
          {children ?? "This part of Gamesprout is still being built."}
        </p>
      </div>
    </>
  );
}
