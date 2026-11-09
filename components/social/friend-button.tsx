"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Relation } from "@/lib/social-shared";
import { cn } from "@/lib/utils";

const pill =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-bold transition disabled:opacity-60";

// Add / Requested / Accept + Decline / Friends, depending on how you're
// connected. Uses the friendships table's rules: you can send requests,
// accept ones sent to you, and remove any friendship you're part of.
export function FriendButton({
  me,
  otherId,
  otherName,
  relation: initial,
  size = "md",
}: {
  me: string;
  otherId: string;
  otherName: string;
  relation: Relation;
  size?: "sm" | "md";
}) {
  const [relation, setRelation] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [confirmUnfriend, setConfirmUnfriend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (relation === "self") return null;

  const run = async (
    next: Relation,
    action: () => PromiseLike<{ error: { message: string; code?: string } | null }>,
  ): Promise<void> => {
    setBusy(true);
    setError(null);
    const { error } = await action();
    setBusy(false);
    if (error) {
      // They sent us a request at the same moment: accept theirs instead.
      if (error.code === "23505" && next === "sent") return accept();
      return setError("Couldn't update. Try again.");
    }
    setRelation(next);
    setConfirmUnfriend(false);
    router.refresh();
  };

  const friendships = () => createClient().from("friendships");
  const remove = (next: Relation) =>
    run(next, () =>
      friendships()
        .delete()
        .or(
          `and(requester_id.eq.${me},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${me})`,
        ),
    );
  const accept = (): Promise<void> =>
    run("friend", () =>
      friendships()
        .update({ status: "accepted" })
        .eq("requester_id", otherId)
        .eq("addressee_id", me),
    );
  const send = () =>
    run("sent", () => friendships().insert({ requester_id: me, addressee_id: otherId }));

  const small = size === "sm" ? "h-8 px-3 text-xs" : "";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-2">
        {relation === "none" && (
          <button type="button" disabled={busy} onClick={send} className={cn(pill, small, "bg-[#4d62db] hover:bg-[#5d71e5]")}>
            <UserPlus className="h-4 w-4" aria-hidden="true" /> Add friend
          </button>
        )}
        {relation === "sent" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => remove("none")}
            title={`Cancel your request to ${otherName}`}
            className={cn(pill, small, "bg-neutral-800 text-neutral-300 hover:bg-neutral-700")}
          >
            Requested
          </button>
        )}
        {relation === "received" && (
          <>
            <button type="button" disabled={busy} onClick={accept} className={cn(pill, small, "bg-[#ffcc00] text-black hover:bg-[#ffd84d]")}>
              <Check className="h-4 w-4" aria-hidden="true" /> Accept
            </button>
            <button type="button" disabled={busy} onClick={() => remove("none")} className={cn(pill, small, "bg-neutral-800 hover:bg-neutral-700")}>
              <X className="h-4 w-4" aria-hidden="true" /> Decline
            </button>
          </>
        )}
        {relation === "friend" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => (confirmUnfriend ? remove("none") : setConfirmUnfriend(true))}
            onBlur={() => setConfirmUnfriend(false)}
            className={cn(
              pill,
              small,
              confirmUnfriend ? "bg-red-900 hover:bg-red-800" : "bg-neutral-800 hover:bg-neutral-700",
            )}
          >
            {confirmUnfriend ? "Tap again to unfriend" : <><Check className="h-4 w-4" aria-hidden="true" /> Friends</>}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
