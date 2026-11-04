"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { FriendButton } from "@/components/social/friend-button";
import { PersonAvatar } from "@/components/social/person-avatar";
import { createClient } from "@/lib/supabase/client";
import { relationFrom, toPerson, type Person, type Relation } from "@/lib/social-shared";

type Result = Person & { relation: Relation };

// Find people by username (or display name) and send friend requests.
export function PeopleSearch({ me }: { me: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const supabase = createClient();
      const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.${like},display_name.ilike.${like}`)
        .neq("id", me)
        .order("username")
        .limit(10);
      const people = (data ?? []).map(toPerson);
      const ids = people.map((p) => p.id);
      const { data: links } = ids.length
        ? await supabase
            .from("friendships")
            .select("requester_id, addressee_id, status")
            .or(`requester_id.eq.${me},addressee_id.eq.${me}`)
        : { data: [] };
      if (cancelled) return;
      setResults(
        people.map((p) => ({
          ...p,
          relation: relationFrom(
            me,
            p.id,
            (links ?? []).find((f) => f.requester_id === p.id || f.addressee_id === p.id) ?? null,
          ),
        })),
      );
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [q, me]);

  return (
    <div>
      <label htmlFor="people-search" className="sr-only">
        Find people by username
      </label>
      <div className="flex h-11 items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-4 focus-within:border-[#4d62db] focus-within:ring-2 focus-within:ring-[#4d62db]">
        <Search className="h-4 w-4 text-neutral-400" aria-hidden="true" />
        <input
          id="people-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by username"
          autoCapitalize="none"
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-neutral-500 focus-visible:outline-none"
        />
      </div>

      {results && (
        <ul className="mt-2" aria-live="polite">
          {results.length === 0 ? (
            <li className="py-3 text-center text-sm text-neutral-400">
              No one matches &ldquo;{q.trim()}&rdquo;.
            </li>
          ) : (
            results.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <Link href={`/protected/people/${p.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <PersonAvatar person={p} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{p.displayName || p.username}</span>
                    <span className="block truncate text-xs text-neutral-400">@{p.username}</span>
                  </span>
                </Link>
                <FriendButton me={me} otherId={p.id} otherName={p.username} relation={p.relation} size="sm" />
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
