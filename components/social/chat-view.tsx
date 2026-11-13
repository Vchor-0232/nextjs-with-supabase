"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, SendHorizontal } from "lucide-react";
import { PersonAvatar } from "@/components/social/person-avatar";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, Person } from "@/lib/social-shared";
import { cn } from "@/lib/utils";

// One-on-one chat with a friend. Patterns borrowed from ClubCom's chat.js:
// messages grouped into runs, a time label after 15 quiet minutes, your
// message shown right away while it sends, and live delivery with a
// regular check as a safety net.

const GAP_MS = 15 * 60 * 1000;
const POLL_MS = 10_000;
const BODY_MAX = 2000;

type Shown = ChatMessage & { sending?: boolean };

type Row = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

const fromRow = (m: Row): ChatMessage => ({
  id: m.id,
  senderId: m.sender_id,
  recipientId: m.recipient_id,
  body: m.body,
  createdAt: m.created_at,
  readAt: m.read_at,
});

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

// "Today 4:05 PM", "Yesterday 9:12 AM", "Mon, Nov 3 at 7:30 PM"
function separatorTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (sameDay(d, now)) return `Today ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return `Yesterday ${time}`;
  return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${time}`;
}

export function ChatView({
  me,
  friend,
  initialMessages,
}: {
  me: string;
  friend: Person;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<Shown[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const name = friend.displayName?.trim() || friend.username;

  // Add messages we don't have yet, in time order.
  const merge = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return;
    setMessages((current) => {
      const known = new Set(current.map((m) => m.id));
      const fresh = incoming.filter((m) => !known.has(m.id));
      if (!fresh.length) return current;
      return [...current, ...fresh].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
  }, []);

  const markRead = useCallback(async () => {
    await createClient()
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", me)
      .eq("sender_id", friend.id)
      .is("read_at", null);
  }, [me, friend.id]);

  // Live delivery: Supabase Realtime tells us about new messages to us.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`dm-${me}-${friend.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `recipient_id=eq.${me}`,
        },
        (payload) => {
          const m = fromRow(payload.new as Row);
          if (m.senderId !== friend.id) return;
          merge([m]);
          if (!document.hidden) markRead();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, friend.id, merge, markRead]);

  // Safety net (like ClubCom's): fetch anything newer every few seconds in
  // case the live connection drops.
  const latestAt = messages.filter((m) => !m.sending).at(-1)?.createdAt ?? null;
  useEffect(() => {
    const poll = async () => {
      if (document.hidden) return;
      let query = createClient()
        .from("direct_messages")
        .select("id, sender_id, recipient_id, body, created_at, read_at")
        .or(
          `and(sender_id.eq.${me},recipient_id.eq.${friend.id}),and(sender_id.eq.${friend.id},recipient_id.eq.${me})`,
        )
        .order("created_at", { ascending: true })
        .limit(100);
      if (latestAt) query = query.gt("created_at", latestAt);
      const { data } = await query;
      const fresh = ((data ?? []) as Row[]).map(fromRow);
      merge(fresh);
      if (fresh.some((m) => m.senderId === friend.id)) markRead();
    };
    const timer = window.setInterval(poll, POLL_MS);
    return () => window.clearInterval(timer);
  }, [me, friend.id, latestAt, merge, markRead]);

  // Opening the chat counts as reading it.
  useEffect(() => {
    markRead();
  }, [markRead]);

  // Keep the newest message in view unless you've scrolled up to read.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    setError(null);
    stickToBottom.current = true;

    const temp: Shown = {
      id: `sending-${Date.now()}`,
      senderId: me,
      recipientId: friend.id,
      body,
      createdAt: new Date().toISOString(),
      readAt: null,
      sending: true,
    };
    setMessages((current) => [...current, temp]);

    const { data, error } = await createClient()
      .from("direct_messages")
      .insert({ sender_id: me, recipient_id: friend.id, body })
      .select("id, sender_id, recipient_id, body, created_at, read_at")
      .single();

    if (error || !data) {
      setMessages((current) => current.filter((m) => m.id !== temp.id));
      setDraft((d) => d || body); // give the text back so nothing is lost
      setError(
        error?.code === "42501"
          ? `You can only message friends. Is @${friend.username} still your friend?`
          : "Message didn't send. Try again.",
      );
      return;
    }
    const saved = fromRow(data as Row);
    setMessages((current) => {
      const withoutTemp = current.filter((m) => m.id !== temp.id);
      return withoutTemp.some((m) => m.id === saved.id) ? withoutTemp : [...withoutTemp, saved];
    });
    inputRef.current?.focus();
  };

  return (
    // Fills the screen below the Gamesprout header (the tab bar is hidden here).
    <div className="fixed inset-x-0 bottom-0 top-12 z-10 mx-auto flex w-full max-w-md flex-col bg-black px-3 pt-2 md:max-w-3xl md:px-6 lg:left-60 lg:top-14 lg:pt-4">
      {/* Who you're chatting with; tap to see their profile. */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
        <Link
          href="/protected/friends"
          aria-label="Back to friends"
          className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-neutral-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Link href={`/protected/people/${friend.username}`} className="flex min-w-0 items-center gap-2">
          <PersonAvatar person={friend} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-bold">{name}</span>
            <span className="block truncate text-xs text-neutral-400">@{friend.username}</span>
          </span>
        </Link>
      </div>

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
        role="log"
        aria-live="polite"
        aria-label={`Chat with ${name}`}
        className="flex-1 overflow-y-auto py-3"
      >
        {messages.length === 0 && (
          <p className="mt-6 text-center text-sm text-neutral-400">
            This is the start of your chat with {name}. Say hi!
          </p>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const t = new Date(m.createdAt).getTime();
          const newBlock = !prev || t - new Date(prev.createdAt).getTime() > GAP_MS;
          const mine = m.senderId === me;
          const runEnd =
            !next ||
            next.senderId !== m.senderId ||
            new Date(next.createdAt).getTime() - t > GAP_MS;
          return (
            <div key={m.id}>
              {newBlock && (
                <p className="my-3 text-center text-xs font-semibold text-neutral-500">
                  {separatorTime(m.createdAt)}
                </p>
              )}
              <div className={cn("flex", mine ? "justify-end" : "justify-start", runEnd ? "mb-2" : "mb-0.5")}>
                <p
                  title={new Date(m.createdAt).toLocaleString()}
                  className={cn(
                    "max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px]",
                    mine ? "bg-[#4d62db] text-white" : "bg-neutral-800 text-white",
                    runEnd && (mine ? "rounded-br-md" : "rounded-bl-md"),
                    m.sending && "opacity-60",
                  )}
                >
                  {m.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mb-2 rounded-xl bg-red-950/70 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      )}

      <form
        onSubmit={send}
        className="flex items-end gap-2 border-t border-neutral-800 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
      >
        <label htmlFor="message" className="sr-only">
          Message {name}
        </label>
        <textarea
          id="message"
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends on computers; Shift+Enter (or phones) adds a line.
            const coarse = window.matchMedia("(pointer: coarse)").matches;
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !coarse) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={BODY_MAX}
          placeholder={`Message @${friend.username}`}
          className="max-h-36 min-h-11 flex-1 resize-none rounded-3xl bg-white px-4 py-2.5 text-[15px] text-black [field-sizing:content] placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4d62db]"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Send"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#4d62db] transition hover:bg-[#5d71e5] disabled:opacity-40"
        >
          <SendHorizontal className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
