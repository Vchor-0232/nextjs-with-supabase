import Link from "next/link";
import { ChevronRight, Pencil, ShieldCheck } from "lucide-react";
import { Narrow, PageTitle } from "@/components/home/app-chrome";
import { GamesproutLogoutButton } from "@/components/home/logout-button";

const row =
  "flex items-center gap-3 px-4 py-3.5 font-semibold transition hover:bg-neutral-900";

export default function SettingsPage() {
  return (
    <Narrow>
      <PageTitle>Settings</PageTitle>
      <nav
        aria-label="Settings"
        className="mb-6 divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950"
      >
        <Link href="/protected/profile/edit" className={row}>
          <Pencil className="h-5 w-5 text-[#8c9bff]" aria-hidden="true" />
          <span className="flex-1">Edit profile</span>
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
