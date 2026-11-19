"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Settings: "Show friends when I'm online". Hidden until the online-status
// database update has been run.
export function OnlineStatusToggle({ className }: { className?: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [on, setOn] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const { data: session } = await supabase.auth.getSession();
      const id = session.session?.user.id;
      if (!id) return;
      const { data, error } = await supabase.from("profiles").select("show_online").eq("id", id).maybeSingle();
      if (error || !data) return;
      setUserId(id);
      setOn((data as { show_online: boolean }).show_online);
    })();
  }, []);

  if (on === null || !userId) return null;

  const toggle = async () => {
    const next = !on;
    setOn(next);
    setSaving(true);
    setError(false);
    const { error } = await createClient().from("profiles").update({ show_online: next }).eq("id", userId);
    setSaving(false);
    if (error) {
      setOn(!next);
      setError(true);
    }
  };

  return (
    <div className={cn("flex items-center gap-3 px-4 py-3.5 text-sm font-extrabold", className)}>
      <Eye className="h-5 w-5 text-[#8c9bff]" aria-hidden="true" />
      <span className="flex-1" id="online-status-label">
        Show friends when I&apos;m online
        <span className="block text-xs font-semibold text-white/60">
          {error ? "Couldn't save. Try again." : "Only your friends can ever see it"}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby="online-status-label"
        onClick={toggle}
        disabled={saving}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border-2 border-black transition",
          on ? "bg-[#2bb673]" : "bg-white/25",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            on ? "left-[22px]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}
