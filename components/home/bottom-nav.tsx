"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import {
  ChartNoAxesColumn,
  House,
  Settings,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/protected", label: "Home", Icon: House },
  { href: "/protected/charts", label: "Charts", Icon: ChartNoAxesColumn },
  { href: "/protected/profile", label: "Profile", Icon: User },
  { href: "/protected/settings", label: "Settings", Icon: Settings },
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
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md rounded-t-3xl bg-[#4d62db] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_12px_rgba(0,0,0,0.5)]"
    >
      <ul className="flex items-stretch justify-between">
        {TABS.map(({ href, label, Icon }) => {
          // Sub-pages (like Profile → Edit profile) keep their tab highlighted.
          const active =
            pathname !== null &&
            (href === "/protected" ? pathname === href : pathname.startsWith(href));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl py-1 text-black transition hover:bg-black/10",
                  // Current tab is yellow, as in the Profile design.
                  active && "text-[#f5c518] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]",
                )}
              >
                <Icon className="h-7 w-7" strokeWidth={2} />
                <span className="text-[13px] font-bold">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
