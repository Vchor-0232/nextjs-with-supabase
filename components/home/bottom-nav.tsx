"use client";

/* eslint-disable @next/next/no-img-element -- small static SVG icons */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

// Phones: the tab bar at the bottom (the Figma phone frames).
// Computers: links in the blue header (the Figma desktop prototype), which
// also has Friends.
// Reading the page address waits for the page itself on pages like a chat,
// so show the tabs without a highlight until it's known.

const PHONE_TABS = [
  { href: "/protected", label: "Home", icon: "/icons/nav-home.svg" },
  { href: "/protected/charts", label: "Charts", icon: "/icons/nav-charts.svg" },
  { href: "/protected/profile", label: "Profile", icon: "/icons/nav-profile.svg" },
  { href: "/protected/settings", label: "Settings", icon: "/icons/nav-settings.svg" },
];

const DESKTOP_TABS = [
  { href: "/protected", label: "Home" },
  { href: "/protected/charts", label: "Charts" },
  { href: "/protected/friends", label: "Friends" },
  { href: "/protected/profile", label: "Profile" },
  { href: "/protected/settings", label: "Settings" },
];

// Which tab a page belongs to. Sub-pages keep their tab highlighted.
function activeTab(pathname: string | null, desktop: boolean) {
  if (pathname === null) return null;
  if (pathname === "/protected") return "/protected";
  if (pathname.startsWith("/protected/developer")) return "/protected/profile";
  if (
    desktop &&
    (pathname.startsWith("/protected/people") || pathname.startsWith("/protected/messages"))
  ) {
    return "/protected/friends";
  }
  const tabs = desktop ? DESKTOP_TABS : PHONE_TABS;
  return tabs.find((t) => t.href !== "/protected" && pathname.startsWith(t.href))?.href ?? null;
}

export function BottomNav() {
  return (
    <Suspense fallback={<PhoneTabBar pathname={null} />}>
      <CurrentPhoneTabBar />
    </Suspense>
  );
}

function CurrentPhoneTabBar() {
  const pathname = usePathname();
  // Chats use the whole phone screen for messages and the message box.
  if (pathname.startsWith("/protected/messages/")) return null;
  return <PhoneTabBar pathname={pathname} />;
}

function PhoneTabBar({ pathname }: { pathname: string | null }) {
  const active = activeTab(pathname, false);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-black bg-[#4d62db] px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_18px_rgba(0,0,0,0.4)] md:max-w-3xl lg:hidden"
    >
      <ul className="grid grid-cols-4 gap-3.5">
        {PHONE_TABS.map(({ href, label, icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={active === href ? "page" : undefined}
              className="flex h-[55px] flex-col items-center justify-center gap-1 rounded-xl transition hover:-translate-y-0.5 hover:bg-white/[0.13]"
            >
              <img src={icon} alt="" width={32} height={32} className="h-8 w-8" />
              {/* Current tab's label is yellow, as in the designs. */}
              <span
                className={cn(
                  "text-base font-bold leading-5",
                  active === href ? "text-[#ffcc00]" : "text-black",
                )}
              >
                {label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function DesktopNav() {
  return (
    <Suspense fallback={<DesktopLinks pathname={null} />}>
      <CurrentDesktopLinks />
    </Suspense>
  );
}

function CurrentDesktopLinks() {
  return <DesktopLinks pathname={usePathname()} />;
}

function DesktopLinks({ pathname }: { pathname: string | null }) {
  const active = activeTab(pathname, true);
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
      {DESKTOP_TABS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={active === href ? "page" : undefined}
          className={cn(
            "rounded-[10px] px-3 py-[7px] text-sm font-extrabold transition",
            active === href
              ? "bg-black/[0.28] text-[#ffcc00]"
              : "text-white/[0.86] hover:bg-white/[0.14] hover:text-white",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
