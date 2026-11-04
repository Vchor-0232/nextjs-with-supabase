"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesColumn,
  House,
  MessageCircle,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/protected", label: "Home", Icon: House },
  { href: "/protected/charts", label: "Charts", Icon: ChartNoAxesColumn },
  { href: "/protected/profile", label: "Profile", Icon: User },
  { href: "/protected/messages", label: "Messages", Icon: MessageCircle },
  { href: "/protected/friends", label: "Friends", Icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md rounded-t-3xl bg-[#4d62db] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_12px_rgba(0,0,0,0.5)]"
    >
      <ul className="flex items-stretch justify-between">
        {TABS.map(({ href, label, Icon }) => {
          // Sub-pages (like Profile → Edit profile) keep their tab highlighted.
          const active =
            href === "/protected" ? pathname === href : pathname.startsWith(href);
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
