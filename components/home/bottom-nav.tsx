"use client";

/* eslint-disable @next/next/no-img-element -- small static SVG icons */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

// Icons are the design's own files (black, with a soft yellow glow).
const TABS = [
  { href: "/protected", label: "Home", icon: "/icons/nav-home.svg" },
  { href: "/protected/charts", label: "Charts", icon: "/icons/nav-charts.svg" },
  { href: "/protected/profile", label: "Profile", icon: "/icons/nav-profile.svg" },
  { href: "/protected/settings", label: "Settings", icon: "/icons/nav-settings.svg" },
];

// Phones get a tab bar at the bottom; computers get a sidebar on the left.
// Reading the page address waits for the page itself on pages like a chat,
// so show the tabs without a highlight until it's known.
export function BottomNav() {
  return (
    <Suspense fallback={<TabBar pathname={null} />}>
      <CurrentTabBar />
    </Suspense>
  );
}

function CurrentTabBar() {
  const pathname = usePathname();
  // On phones, chats use the whole screen for messages and the message box.
  return (
    <TabBar pathname={pathname} hideBottomBar={pathname.startsWith("/protected/messages/")} />
  );
}

function isActive(href: string, pathname: string | null) {
  // Sub-pages (like Profile → Edit profile) keep their tab highlighted.
  if (pathname === null) return false;
  return href === "/protected" ? pathname === href : pathname.startsWith(href);
}

function TabBar({
  pathname,
  hideBottomBar = false,
}: {
  pathname: string | null;
  hideBottomBar?: boolean;
}) {
  return (
    <>
      {!hideBottomBar && (
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-black bg-[#4d62db] px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_18px_rgba(0,0,0,0.4)] md:max-w-3xl lg:hidden"
        >
          <ul className="grid grid-cols-4 gap-3.5">
            {TABS.map(({ href, label, icon }) => {
              const active = isActive(href, pathname);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className="flex h-[55px] flex-col items-center justify-center gap-1 rounded-xl transition hover:-translate-y-0.5 hover:bg-white/[0.13]"
                  >
                    <img src={icon} alt="" width={32} height={32} className="h-8 w-8" />
                    {/* Current tab's label is yellow, as in the designs. */}
                    <span
                      className={cn(
                        "text-base font-bold leading-5",
                        active ? "text-[#ffcc00]" : "text-black",
                      )}
                    >
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* Computers: the same tabs down the left side. */}
      <nav
        aria-label="Main"
        className="fixed bottom-0 left-0 top-14 z-20 hidden w-60 border-r border-black bg-[#4d62db] px-3 pt-5 shadow-[8px_0_18px_rgba(0,0,0,0.35)] lg:block"
      >
        <ul className="flex flex-col gap-1.5">
          {TABS.map(({ href, label, icon }) => {
            const active = isActive(href, pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-12 items-center gap-3 rounded-xl px-3 transition hover:translate-x-0.5 hover:bg-white/[0.13]",
                    active && "bg-black/20",
                  )}
                >
                  <img src={icon} alt="" width={28} height={28} className="h-7 w-7" />
                  <span
                    className={cn(
                      "text-base font-bold",
                      active ? "text-[#ffcc00]" : "text-black",
                    )}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
