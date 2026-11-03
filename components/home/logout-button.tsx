"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function GamesproutLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    await createClient().auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="h-10 w-full rounded-full border border-white/60 bg-black font-bold text-white shadow-[0_4px_6px_rgba(0,0,0,0.35)] transition hover:bg-neutral-900 disabled:opacity-60"
    >
      {busy ? "Logging out..." : "Log out"}
    </button>
  );
}
