import Link from "next/link";
import { ChevronRight, Gamepad2, Pencil, ShieldCheck } from "lucide-react";
import { Narrow, PageTitle } from "@/components/home/app-chrome";
import { GamesproutLogoutButton } from "@/components/home/logout-button";

const row =
  "flex items-center gap-3 px-4 py-3.5 text-sm font-extrabold transition hover:bg-white/[0.11]";

export default function SettingsPage() {
  return (
    <Narrow>
      <PageTitle>Settings</PageTitle>
      <nav
        aria-label="Settings"
        className="mb-4 divide-y divide-white/[0.12] overflow-hidden rounded-[16px] border border-white/[0.12] bg-white/[0.07] shadow-[0_8px_22px_-12px_rgba(0,0,0,0.65)]"
      >
        <Link href="/protected/profile/edit" className={row}>
          <Pencil className="h-5 w-5 text-[#8c9bff]" aria-hidden="true" />
          <span className="flex-1">Edit profile</span>
          <ChevronRight className="h-5 w-5 text-neutral-500" aria-hidden="true" />
        </Link>
        <Link href="/protected/developer" className={row}>
          <Gamepad2 className="h-5 w-5 text-[#8c9bff]" aria-hidden="true" />
          <span className="flex-1">
            Add your game
            <span className="block text-xs font-semibold text-white/60">For Roblox developers</span>
          </span>
          <ChevronRight className="h-5 w-5 text-neutral-500" aria-hidden="true" />
        </Link>
        <Link href="/auth/update-password" className={row}>
          <ShieldCheck className="h-5 w-5 text-[#8c9bff]" aria-hidden="true" />
          <span className="flex-1">Change password</span>
          <ChevronRight className="h-5 w-5 text-neutral-500" aria-hidden="true" />
        </Link>
      </nav>
      <GamesproutLogoutButton />
    </Narrow>
  );
}
