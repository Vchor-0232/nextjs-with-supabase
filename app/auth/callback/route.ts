import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// Google, Facebook, Discord and Twitch send people back here after they
// approve the login. We swap the one-time code for a Supabase session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Only allow redirects to pages on this site.
  const nextParam = searchParams.get("next") ?? "/protected";
  const next =
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//") &&
    !nextParam.startsWith("/\\")
      ? nextParam
      : "/protected";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent(error.message)}`,
    );
  }

  const providerError =
    searchParams.get("error_description") ?? "Missing login code";
  return NextResponse.redirect(
    `${origin}/auth/error?error=${encodeURIComponent(providerError)}`,
  );
}
