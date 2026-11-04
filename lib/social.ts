import { createClient } from "@/lib/supabase/server";

// Friends, friend requests and one-on-one chats.
// Everything is read as the logged-in user, so the database's rules decide
// what they can see (their own friendships and their own messages only).

import {
  relationFrom,
  toPerson,
  type ChatMessage,
  type Person,
  type Relation,
} from "@/lib/social-shared";

export type { ChatMessage, Person, Relation };

const PERSON_COLUMNS = "id, username, display_name, avatar_url";

type PersonRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type FriendshipRow = {
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
};

// Usernames are unique ignoring capitals. In ilike "_" is a wildcard, so escape it.
const exactUsername = (u: string) => u.replace(/\\/g, "\\\\").replace(/[_%]/g, (c) => `\\${c}`);

export async function getPersonPage(username: string, me: string) {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("profiles")
    .select(`${PERSON_COLUMNS}, bio, roblox_username`)
    .ilike("username", exactUsername(username))
    .maybeSingle();
  if (!row) return null;

  const person = row as PersonRow & { bio: string | null; roblox_username: string | null };
  const pair = `and(requester_id.eq.${me},addressee_id.eq.${person.id}),and(requester_id.eq.${person.id},addressee_id.eq.${me})`;

  const [friendshipRes, friendCountRes, followersRes, followingRes] = await Promise.all([
    supabase
      .from("friendships")
      .select("requester_id, addressee_id, status")
      .or(pair)
      .maybeSingle(),
    // Counts other people's friendships, which the rules only reveal to the
    // two people involved, so this is "friends you can see" — see below.
    supabase
      .from("friendships")
      .select("requester_id", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${person.id},addressee_id.eq.${person.id}`),
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", person.id),
    supabase
      .from("follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", person.id),
  ]);

  return {
    person: toPerson(person),
    bio: person.bio,
    robloxUsername: person.roblox_username,
    relation: relationFrom(me, person.id, friendshipRes.data as FriendshipRow | null),
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
    // Friendships are private to the two people in them, so for someone else
    // this only counts your friendship with them. Hide it unless it's you.
    friendCount: me === person.id ? (friendCountRes.count ?? 0) : null,
  };
}

export type FriendListItem = Person & {
  lastMessage: { body: string; fromMe: boolean; createdAt: string } | null;
  unread: number;
};

// Everything on the Friends page: requests, friends (with their latest
// message and unread count) and requests you've sent.
export async function getFriendsPage(me: string) {
  const supabase = await createClient();

  const [friendshipsRes, messagesRes] = await Promise.all([
    supabase
      .from("friendships")
      .select(
        `requester_id, addressee_id, status, created_at,
         requester:profiles!friendships_requester_id_fkey(${PERSON_COLUMNS}),
         addressee:profiles!friendships_addressee_id_fkey(${PERSON_COLUMNS})`,
      )
      .or(`requester_id.eq.${me},addressee_id.eq.${me}`)
      .order("created_at", { ascending: false }),
    // Recent messages, newest first, to find each chat's latest message.
    supabase
      .from("direct_messages")
      .select("sender_id, recipient_id, body, created_at, read_at")
      .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const rows = (friendshipsRes.data ?? []) as unknown as (FriendshipRow & {
    requester: PersonRow;
    addressee: PersonRow;
  })[];

  const latest = new Map<string, FriendListItem["lastMessage"]>();
  const unread = new Map<string, number>();
  for (const m of (messagesRes.data ?? []) as {
    sender_id: string;
    recipient_id: string;
    body: string;
    created_at: string;
    read_at: string | null;
  }[]) {
    const other = m.sender_id === me ? m.recipient_id : m.sender_id;
    if (!latest.has(other)) {
      latest.set(other, { body: m.body, fromMe: m.sender_id === me, createdAt: m.created_at });
    }
    if (m.recipient_id === me && !m.read_at) unread.set(other, (unread.get(other) ?? 0) + 1);
  }

  const friends: FriendListItem[] = [];
  const received: Person[] = [];
  const sent: Person[] = [];
  for (const r of rows) {
    const other = toPerson(r.requester_id === me ? r.addressee : r.requester);
    if (r.status === "accepted") {
      friends.push({ ...other, lastMessage: latest.get(other.id) ?? null, unread: unread.get(other.id) ?? 0 });
    } else if (r.requester_id === me) {
      sent.push(other);
    } else {
      received.push(other);
    }
  }

  // Friends you've talked to most recently first, then everyone else A–Z.
  friends.sort((a, b) => {
    if (a.lastMessage && b.lastMessage) return b.lastMessage.createdAt.localeCompare(a.lastMessage.createdAt);
    if (a.lastMessage || b.lastMessage) return a.lastMessage ? -1 : 1;
    return a.username.localeCompare(b.username);
  });

  return {
    error: friendshipsRes.error?.message ?? messagesRes.error?.message ?? null,
    friends,
    received,
    sent,
  };
}

const CHAT_HISTORY = 200;

// The chat with one friend: the last 200 messages, oldest first.
export async function getChat(me: string, username: string) {
  const page = await getPersonPage(username, me);
  if (!page || page.relation === "self") return null;

  const supabase = await createClient();
  const them = page.person.id;
  const { data, error } = await supabase
    .from("direct_messages")
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .or(
      `and(sender_id.eq.${me},recipient_id.eq.${them}),and(sender_id.eq.${them},recipient_id.eq.${me})`,
    )
    .order("created_at", { ascending: false })
    .limit(CHAT_HISTORY);

  const messages: ChatMessage[] = ((data ?? []) as {
    id: string;
    sender_id: string;
    recipient_id: string;
    body: string;
    created_at: string;
    read_at: string | null;
  }[])
    .reverse()
    .map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      recipientId: m.recipient_id,
      body: m.body,
      createdAt: m.created_at,
      readAt: m.read_at,
    }));

  return { ...page, messages, error: error?.message ?? null };
}
