import { NextResponse, type NextRequest } from "next/server";
import { robloxUserFromCode, STATE_COOKIE, VERIFIER_COOKIE } from "@/lib/roblox-oauth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Roblox sends the person back here after they sign in. We check it's the
// same sign-in we started, ask Roblox who they are, and save the link.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const back = (query: string) => {
    const res = NextResponse.redirect(`${origin}/protected/developer?${query}`);
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/roblox" });
    res.cookies.delete({ name: VERIFIER_COOKIE, path: "/api/roblox" });
    return res;
  };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.redirect(`${origin}/auth/login`);
  const userId = data.claims.sub;

  if (url.searchParams.get("error")) return back("error=cancelled");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = request.cookies.get(STATE_COOKIE)?.value;
  const verifier = request.cookies.get(VERIFIER_COOKIE)?.value;
  if (!code || !state || !savedState || !verifier || state !== savedState) {
    return back("error=expired");
  }

  let roblox;
  try {
    roblox = await robloxUserFromCode(code, verifier, `${origin}/api/roblox/callback`);
  } catch (e) {
    console.error("Roblox sign-in failed:", e);
    return back("error=roblox");
  }

  const admin = createAdminClient();
  if (!admin) return back("error=server");

  // One Gamesprout account per Roblox account.
  const { data: taken } = await admin
    .from("roblox_accounts")
    .select("user_id")
    .eq("roblox_user_id", roblox.id)
    .maybeSingle();
  if (taken && taken.user_id !== userId) return back("error=taken");

  const { error } = await admin.from("roblox_accounts").upsert({
    user_id: userId,
    roblox_user_id: roblox.id,
    roblox_username: roblox.username,
    roblox_display_name: roblox.displayName,
    avatar_url: roblox.avatarUrl,
    connected_at: new Date().toISOString(),
  });
  if (error) {
    console.error("Couldn't save Roblox link:", error.message);
    return back("error=server");
  }
  return back("connected=1");
}
