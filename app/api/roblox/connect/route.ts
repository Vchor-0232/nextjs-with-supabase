import { NextResponse } from "next/server";
import { authorizeUrl, newPkce, robloxOAuthConfig, STATE_COOKIE, VERIFIER_COOKIE } from "@/lib/roblox-oauth";
import { createClient } from "@/lib/supabase/server";

// "Connect Roblox account" button: sends the person to Roblox to sign in.
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.redirect(`${origin}/auth/login`);

  const config = robloxOAuthConfig();
  if (!config) return NextResponse.redirect(`${origin}/protected/developer?error=not_set_up`);

  const { verifier, challenge, state } = newPkce();
  const res = NextResponse.redirect(
    authorizeUrl(config.clientId, `${origin}/api/roblox/callback`, state, challenge),
  );
  // Checked when Roblox sends the person back, so nobody else can finish
  // this sign-in for them. Expires after 10 minutes.
  const cookie = {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax" as const,
    path: "/api/roblox",
    maxAge: 600,
  };
  res.cookies.set(STATE_COOKIE, state, cookie);
  res.cookies.set(VERIFIER_COOKIE, verifier, cookie);
  return res;
}
