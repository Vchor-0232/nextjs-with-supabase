"use client";

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

// Reading the page address waits for the page itself on pages like a chat,
// so show the tab bar without a highlight until it's known.
export function BottomNav() {
  return (
    <Suspense fallback={<TabBar pathname={null} />}>
      <CurrentTabBar />
    </Suspense>
  );
}

function CurrentTabBar() {
  const pathname = usePathname();
  // Chats use the whole screen for messages and the message box.
  if (pathname.startsWith("/protected/messages/")) return null;
  return <TabBar pathname={pathname} />;
}

function TabBar({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-black bg-[#4d62db] px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_18px_rgba(0,0,0,0.4)]"
    >
      <ul className="grid grid-cols-4 gap-3.5">
        {TABS.map(({ href, label, icon }) => {
          // Sub-pages (like Profile → Edit profile) keep their tab highlighted.
          const active =
            pathname !== null &&
            (href === "/protected" ? pathname === href : pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex h-[55px] flex-col items-center justify-center gap-1 rounded-xl transition hover:-translate-y-0.5 hover:bg-white/[0.13]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG */}
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
  );
}
