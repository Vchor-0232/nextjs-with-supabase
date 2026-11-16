"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserCheck, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Follow / Following on someone's profile. Following is one-way (no
// approval needed), unlike friends. Uses the follows table's rules: you can
// only follow or unfollow as yourself.
export function FollowButton({
  me,
  otherId,
  otherName,
  following: initial,
  className,
}: {
  me: string;
  otherId: string;
  otherName: string;
  following: boolean;
  className?: string;
}) {
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const toggle = async () => {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = following
      ? await supabase.from("follows").delete().eq("follower_id", me).eq("following_id", otherId)
      : await supabase.from("follows").insert({ follower_id: me, following_id: otherId });
    // Already following (e.g. from another tab) counts as success.
    if (error && error.code !== "23505") {
      setError(following ? "Couldn't unfollow. Try again." : "Couldn't follow. Try again.");
    } else {
      setFollowing(!following);
      router.refresh(); // update the Followers count
    }
    setBusy(false);
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={following}
        aria-label={following ? `Unfollow @${otherName}` : `Follow @${otherName}`}
        className={cn(
          "group flex h-10 w-full items-center justify-center gap-1.5 rounded-[20px] text-sm font-extrabold transition disabled:opacity-60",
          following
            ? "border border-white/20 bg-white/10 text-white hover:border-red-300/60 hover:text-red-200"
            : "bg-[#4d62db] text-white shadow-[0_4px_10px_rgba(77,98,219,0.45)] hover:bg-[#5d71e5]",
        )}
      >
        {following ? (
          <>
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            <span className="group-hover:hidden">Following</span>
            <span className="hidden group-hover:inline">Unfollow</span>
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Follow
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-center text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
