import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ChatView } from "@/components/social/chat-view";
import { getChat } from "@/lib/social";
import { createClient } from "@/lib/supabase/server";

async function ChatContent({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const me = auth?.claims?.sub;
  if (!me) redirect("/auth/login");

  const chat = await getChat(me, decodeURIComponent(username));
  if (!chat) notFound();

  // Chats are only between friends (the database enforces this too).
  if (chat.relation !== "friend") {
    return (
      <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-center">
        <p className="font-bold">You can only chat with friends.</p>
        <Link
          href={`/protected/people/${chat.person.username}`}
          className="mt-4 inline-flex h-10 items-center rounded-full bg-[#ffcc00] px-5 font-bold text-black"
        >
          View @{chat.person.username}
        </Link>
      </div>
    );
  }

  if (chat.error) console.error("Chat failed to load:", chat.error);
  return <ChatView me={me} friend={chat.person} initialMessages={chat.messages} />;
}

export default function ChatPage({ params }: { params: Promise<{ username: string }> }) {
  return (
    <Suspense fallback={<div className="mt-4 h-[70svh] animate-pulse rounded-2xl bg-neutral-900" />}>
      <ChatContent params={params} />
    </Suspense>
  );
}
