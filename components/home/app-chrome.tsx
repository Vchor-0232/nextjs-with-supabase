import Link from "next/link";
import { Bell, Gamepad2, Search, Sprout } from "lucide-react";
import { BottomNav } from "@/components/home/bottom-nav";

// The frame around every page: blue header on top, bar at the bottom, black
// in between (from the Figma "homepage" frame). Logged-in pages get the tab
// bar; the public home page gets Log in / Sign up instead.
export function AppChrome({
  children,
  variant = "app",
}: {
  children: React.ReactNode;
  variant?: "app" | "public";
}) {
  return (
    <div className="min-h-svh bg-black text-white">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col">
        <AppHeader variant={variant} />
        <main className="flex-1 px-3 pb-28 pt-4">{children}</main>
        {variant === "app" ? <BottomNav /> : <PublicBottomBar />}
      </div>
    </div>
  );
}

function PublicBottomBar() {
  const button =
    "flex h-11 flex-1 items-center justify-center rounded-full border font-bold shadow-[0_4px_6px_rgba(0,0,0,0.35)] transition";
  return (
    <nav
      aria-label="Account"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-md gap-3 rounded-t-3xl bg-[#4d62db] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.5)]"
    >
      <Link
        href="/auth/login"
        className={`${button} border-white/60 bg-black text-white hover:bg-neutral-900`}
      >
        Log in
      </Link>
      <Link
        href="/auth/sign-up"
        className={`${button} border-black bg-white text-black hover:bg-neutral-200`}
      >
        Sign up
      </Link>
    </nav>
  );
}

function AppHeader({ variant }: { variant: "app" | "public" }) {
  return (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between rounded-b-2xl bg-[#4d62db] px-4 shadow-[0_4px_10px_rgba(0,0,0,0.4)]">
      <Link
        href={variant === "app" ? "/protected" : "/"}
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
      {variant === "public" ? (
        <Link
          href="/auth/login"
          className="rounded-full px-3 py-1 text-sm font-bold transition hover:bg-white/15"
        >
          Log in
        </Link>
      ) : (
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
      )}
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
