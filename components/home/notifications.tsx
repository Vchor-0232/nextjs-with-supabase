"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { PersonAvatar } from "@/components/social/person-avatar";
import { createClient } from "@/lib/supabase/client";
import type { PersonRow } from "@/lib/social-shared";
import { cn } from "@/lib/utils";

// The bell in the header: friend requests waiting for you and friends with
// unread messages, in a panel that slides in from the right (from the
// Figma desktop prototype).

type Request = { id: string; username: string; name: string; avatarUrl: string | null };
type UnreadChat = Request & { count: number; latest: string };

const PERSON = "id, username, display_name, avatar_url";

const toPerson = (p: PersonRow): Request => ({
  id: p.id,
  username: p.username,
  name: p.display_name || p.username,
  avatarUrl: p.avatar_url,
});

export function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [chats, setChats] = useState<UnreadChat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    setMe(userId);

    const [reqRes, msgRes] = await Promise.all([
      supabase
        .from("friendships")
        .select(`requester:profiles!friendships_requester_id_fkey(${PERSON})`)
        .eq("addressee_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("direct_messages")
        .select(`body, created_at, sender:profiles!direct_messages_sender_id_fkey(${PERSON})`)
        .eq("recipient_id", userId)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (reqRes.error || msgRes.error) {
      setError("Couldn't load notifications.");
      return;
    }
    setError(null);
    setRequests(
      (reqRes.data as unknown as { requester: PersonRow | null }[])
        .filter((r) => r.requester)
        .map((r) => toPerson(r.requester!)),
    );

    // One row per friend, with their newest unread message.
    const bySender = new Map<string, UnreadChat>();
    for (const m of msgRes.data as unknown as { body: string; sender: PersonRow | null }[]) {
      if (!m.sender) continue;
      const existing = bySender.get(m.sender.id);
      if (existing) existing.count += 1;
      else bySender.set(m.sender.id, { ...toPerson(m.sender), count: 1, latest: m.body });
    }
    setChats([...bySender.values()]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    void load();
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, load]);

  const accept = async (person: Request) => {
    if (!me) return;
    const { error } = await createClient()
      .from("friendships")
      .update({ status: "accepted" })
      .eq("requester_id", person.id)
      .eq("addressee_id", me);
    if (error) setError("Couldn't accept. Try again.");
    else setRequests((list) => list.filter((r) => r.id !== person.id));
  };

  const count = requests.length + chats.length;
  const label = "text-[11px] font-extrabold uppercase text-white/65";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={count ? `Notifications (${count} new)` : "Notifications"}
        className="relative grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/15 lg:h-9 lg:w-9 lg:border lg:border-white/20 lg:bg-black/20 lg:hover:bg-black/[0.34]"
      >
        <Bell className="h-5 w-5 text-white" strokeWidth={2} aria-hidden="true" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#ffcc00] px-1 text-[10px] font-black text-black">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex justify-end bg-black/[0.62]"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            className="flex h-full w-[min(100vw,380px)] flex-col gap-3.5 overflow-y-auto border-l border-white/[0.14] bg-[#0d0f17] p-[18px] text-white"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">Notifications</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 rounded-full border border-white/[0.16] bg-white/[0.08] px-3 py-1 text-xs font-extrabold transition hover:bg-white/[0.14]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" /> Close
              </button>
            </div>
            {error && <p role="alert" className="text-[13px] text-red-300">{error}</p>}

            <section>
              <h3 className={cn(label, "mb-2")}>Friend requests</h3>
              {requests.length === 0 ? (
                <p className="rounded-[16px] border border-white/[0.12] bg-white/[0.07] p-3 text-[13px] text-white/65">
                  No pending requests.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {requests.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-2.5 rounded-[16px] border border-white/[0.12] bg-white/[0.07] p-2.5"
                    >
                      <Link
                        href={`/protected/people/${r.username}`}
                        onClick={() => setOpen(false)}
                        className="flex min-w-0 flex-1 items-center gap-2.5"
                      >
                        <PersonAvatar person={r} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-extrabold">{r.name}</span>
                          <span className="block truncate text-[11px] text-white/65">@{r.username}</span>
                        </span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => accept(r)}
                        className="rounded-full bg-[#4d62db] px-[11px] py-[5px] text-xs font-extrabold transition hover:bg-[#5d71e5]"
                      >
                        Accept
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className={cn(label, "mb-2")}>Unread messages</h3>
              {chats.length === 0 ? (
                <p className="rounded-[16px] border border-white/[0.12] bg-white/[0.07] p-3 text-[13px] text-white/65">
                  You&apos;re all caught up.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {chats.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/protected/messages/${c.username}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-[14px] border border-white/[0.12] bg-white/[0.07] px-3 py-2.5 transition hover:bg-white/[0.11]"
                      >
                        <PersonAvatar person={c} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-extrabold">@{c.username}</span>
                          <span className="block truncate text-xs text-white/65">{c.latest}</span>
                        </span>
                        <span className="grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#ffcc00] px-1 text-[10px] font-black text-black">
                          {c.count}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
