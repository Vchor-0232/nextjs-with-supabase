import Link from "next/link";
import { ArrowLeft, Bell, Search } from "lucide-react";
import { GamesproutMark } from "@/components/gamesprout-mark";
import { BottomNav } from "@/components/home/bottom-nav";
import { cn } from "@/lib/utils";

// Shared look from the Figma file (homepage, profile, game page frames):
// blue #4D62DB, yellow #FFCC00, black page, translucent panels.
export const PANEL = "rounded-[16px] border border-white/10 bg-white/[0.07]";

// The frame around every page: blue header on top, bar at the bottom, black
// in between. Logged-in pages get the tab bar; the public home page gets
// Log in / Sign up instead. Pass `backHref` for pages with a back arrow
// (like a game page).
export function AppChrome({
  children,
  variant = "app",
  backHref,
}: {
  children: React.ReactNode;
  variant?: "app" | "public";
  backHref?: string;
}) {
  return (
    <div className="min-h-svh bg-black text-white">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col">
        <AppHeader variant={variant} backHref={backHref} />
        <main className="flex-1 px-[14px] pb-28 pt-1">{children}</main>
        {variant === "app" ? <BottomNav /> : <PublicBottomBar />}
      </div>
    </div>
  );
}

function PublicBottomBar() {
  const button =
    "flex h-11 flex-1 items-center justify-center rounded-full border-2 text-base font-extrabold transition";
  return (
    <nav
      aria-label="Account"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-md gap-3 border-t border-black bg-[#4d62db] px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_18px_rgba(0,0,0,0.4)]"
    >
      <Link
        href="/auth/login"
        className={`${button} border-black bg-[#ffcc00] text-black shadow-[0_4px_0_#000] hover:-translate-y-0.5`}
      >
        Log in
      </Link>
      <Link
        href="/auth/sign-up"
        className={`${button} border-white bg-black text-white shadow-[0_4px_0_rgba(0,0,0,0.2)] hover:-translate-y-0.5`}
      >
        Sign up
      </Link>
    </nav>
  );
}

const headerButton =
  "grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/15";

function AppHeader({
  variant,
  backHref,
}: {
  variant: "app" | "public";
  backHref?: string;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between bg-[#4d62db] pl-[15px] pr-[20px] shadow-[0_6px_9px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-2">
        {backHref && (
          <Link href={backHref} aria-label="Go back" className={headerButton}>
            <ArrowLeft className="h-5 w-5 text-black" strokeWidth={3} />
          </Link>
        )}
        <Link
          href={variant === "app" ? "/protected" : "/"}
          className="flex items-center gap-1.5"
          aria-label="Gamesprout home"
        >
          <GamesproutMark className="-mt-1 w-[30px]" />
          <span className="text-base font-black tracking-[-0.5px] text-white [text-shadow:0_0_8px_#ffcc00]">
            Gamesprout
          </span>
        </Link>
      </div>
      {variant === "public" ? (
        <Link
          href="/auth/login"
          className="rounded-full px-3 py-1 text-[13px] font-extrabold transition hover:bg-white/15"
        >
          Log in
        </Link>
      ) : (
        <div className="flex items-center gap-2">
          {/* Search and notifications aren't built yet. Game pages show only
              the bell, as in the design. */}
          {!backHref && (
            <button
              type="button"
              aria-label="Search (coming soon)"
              title="Search is coming soon"
              className={headerButton}
            >
              <Search className="h-5 w-5 text-white" strokeWidth={2} />
            </button>
          )}
          <button
            type="button"
            aria-label="Notifications (coming soon)"
            title="Notifications are coming soon"
            className={headerButton}
          >
            <Bell className="h-5 w-5 text-white" strokeWidth={2} />
          </button>
        </div>
      )}
    </header>
  );
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="mb-2 text-[40px] font-black leading-[44px] text-white [text-shadow:0_0_10px_#ffcc00]">
      {children}
    </h1>
  );
}

export function SectionHeader({
  title,
  href,
  centered = false,
}: {
  title: string;
  href?: string;
  centered?: boolean; // "Game of the week" is centered in the design
}) {
  return (
    <div className="mb-2 flex h-[30px] items-center justify-between gap-2 rounded-[16px] bg-[#4d62db] px-3">
      {centered && <span aria-hidden="true" className="w-[61px]" />}
      <h2 className={cn("truncate text-base font-bold leading-[22px]", centered && "flex-1 text-center")}>
        {title}
      </h2>
      {href ? (
        <Link
          href={href}
          className="shrink-0 text-[13px] font-bold leading-[18px] underline-offset-2 hover:underline"
        >
          See All →
        </Link>
      ) : (
        centered && <span aria-hidden="true" className="w-[61px]" />
      )}
    </div>
  );
}

// Thin full-width line between sections (home page).
export function SectionDivider() {
  return <hr className="-mx-[14px] my-2 h-px border-0 bg-white/10" />;
}

export function ComingSoon({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <>
      <PageTitle>{title}</PageTitle>
      <div className={`${PANEL} p-6 text-center`}>
        <p className="text-base font-extrabold">Coming soon</p>
        <p className="mt-1 text-[13px] font-semibold text-white/60">
          {children ?? "This part of Gamesprout is still being built."}
        </p>
      </div>
    </>
  );
}
