// Types and helpers for friends and chat that are safe to use in the browser.
// (lib/social.ts has the server-side loaders.)

export type Person = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

// How the logged-in user is connected to someone.
export type Relation = "self" | "friend" | "sent" | "received" | "none";

export type ChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export type PersonRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export const toPerson = (p: PersonRow): Person => ({
  id: p.id,
  username: p.username,
  displayName: p.display_name,
  avatarUrl: p.avatar_url,
});

export type FriendshipRow = {
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
};

export function relationFrom(me: string, other: string, f: FriendshipRow | null): Relation {
  if (me === other) return "self";
  if (!f) return "none";
  if (f.status === "accepted") return "friend";
  return f.requester_id === me ? "sent" : "received";
}

