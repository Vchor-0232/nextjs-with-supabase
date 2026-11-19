import Link from "next/link";
import Form from "next/form";
import { ArrowLeft, Search } from "lucide-react";
import { GamesproutMark } from "@/components/gamesprout-mark";
import { BottomNav, DesktopNav } from "@/components/home/bottom-nav";
import { NotificationsButton } from "@/components/home/notifications";
import { PresencePing } from "@/components/home/presence-ping";
import { cn } from "@/lib/utils";

// Shared look from the Figma file (homepage, profile, game page frames):
// blue #4D62DB, yellow #FFCC00, black page, translucent panels.
export const PANEL = "rounded-[16px] border border-white/10 bg-white/[0.07]";

// The frame around every page. Phones follow the Figma phone frames: blue
// header on top, tab bar at the bottom, black in between. Computers (lg,
// 1024px and up) follow the Figma desktop prototype: the tabs, a search box
// and the bell sit in the header, and pages use a 1152px-wide column.
// Logged-in pages get the tabs; the public home page gets Log in / Sign up
// instead. Pass `backHref` for pages with a back arrow (like a game page).
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
    <div className="flex min-h-svh flex-col bg-black text-white">
      <AppHeader variant={variant} backHref={backHref} />
      <main className="mx-auto w-full max-w-md flex-1 px-[14px] pb-28 pt-1 md:max-w-3xl md:px-6 lg:max-w-[1152px] lg:px-5 lg:pb-12 lg:pt-6">
        {children}
      </main>
      {variant === "app" ? <BottomNav /> : <PublicBottomBar />}
      {variant === "app" && <PresencePing />}
    </div>
  );
}

// Keeps list-style pages (Friends, Settings, ...) at a comfortable reading
// width on big screens.
export function Narrow({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-2xl">{children}</div>;
}

function PublicBottomBar() {
  const button =
    "flex h-11 flex-1 items-center justify-center rounded-full border-2 text-base font-extrabold transition";
  return (
    <nav
      aria-label="Account"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-md gap-3 border-t border-black bg-[#4d62db] px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_18px_rgba(0,0,0,0.4)] md:max-w-3xl lg:hidden"
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
    <header className="sticky top-0 z-30 bg-[#4d62db] shadow-[0_6px_9px_rgba(0,0,0,0.25)] lg:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.65)]">
      <div className="mx-auto flex h-14 max-w-[1152px] items-center justify-between gap-4 pl-[15px] pr-[20px] lg:px-5">
        <div className="flex min-w-0 items-center gap-2 lg:gap-[18px]">
          {backHref && (
            <Link href={backHref} aria-label="Go back" className={headerButton}>
              <ArrowLeft className="h-5 w-5 text-black" strokeWidth={3} />
            </Link>
          )}
          <Link
            href={variant === "app" ? "/protected" : "/"}
            className="flex items-center gap-1.5 lg:gap-2"
            aria-label="Gamesprout home"
          >
            <GamesproutMark className="-mt-1 w-[30px]" />
            <span className="text-base font-black tracking-[-0.5px] text-white [text-shadow:0_0_8px_#ffcc00] lg:text-lg">
              Gamesprout
            </span>
          </Link>
          {variant === "app" && <DesktopNav />}
        </div>
        {variant === "public" ? (
          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="rounded-full px-3 py-1 text-[13px] font-extrabold transition hover:bg-white/15 lg:border-2 lg:border-black lg:bg-[#ffcc00] lg:px-5 lg:py-1.5 lg:text-black lg:shadow-[0_3px_0_#000] lg:hover:bg-[#ffd84d]"
            >
              Log in
            </Link>
            {/* On phones, Sign up is in the bar at the bottom. */}
            <Link
              href="/auth/sign-up"
              className="hidden rounded-full border-2 border-white bg-black px-5 py-1.5 text-[13px] font-extrabold transition hover:bg-neutral-900 lg:block"
            >
              Sign up
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Phones: a search icon (hidden on game pages, as in the design).
                Computers: a search box. Both open the Search page. */}
            {!backHref && (
              <Link href="/protected/search" aria-label="Search" className={`${headerButton} lg:hidden`}>
                <Search className="h-5 w-5 text-white" strokeWidth={2} />
              </Link>
            )}
            <Form
              action="/protected/search"
              role="search"
              className="hidden items-center gap-1.5 rounded-full border border-white/20 bg-black/[0.24] px-3 py-1 lg:flex"
            >
              <Search className="h-3.5 w-3.5 text-white/70" aria-hidden="true" />
              <input
                type="search"
                name="q"
                aria-label="Search games"
                placeholder="Search games..."
                className="w-[170px] bg-transparent text-[13px] text-white outline-none placeholder:text-white/65"
              />
            </Form>
            <NotificationsButton />
          </div>
        )}
      </div>
    </header>
  );
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="mb-2 text-[40px] font-black leading-[44px] text-white [text-shadow:0_0_10px_#ffcc00] lg:mb-[18px] lg:text-[28px] lg:leading-tight lg:tracking-[-0.02em] lg:[text-shadow:none]">
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
export function SectionDivider({ className }: { className?: string }) {
  return <hr className={cn("-mx-[14px] my-2 h-px border-0 bg-white/10 md:-mx-6 lg:mx-0 lg:my-6", className)} />;
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
