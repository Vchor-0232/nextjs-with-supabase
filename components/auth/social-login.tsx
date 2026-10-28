"use client";

import { createClient } from "@/lib/supabase/client";
import { AuthMessage } from "@/components/auth/auth-ui";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import {
  FaDiscord,
  FaEllipsisH,
  FaFacebookF,
  FaTwitch,
} from "react-icons/fa";
import { SiRoblox } from "react-icons/si";

type OAuthProvider = "google" | "facebook" | "discord" | "twitch";

const circle =
  "grid h-11 w-11 place-items-center rounded-full bg-black shadow-[0_4px_6px_rgba(0,0,0,0.35)] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60";

// Asks Supabase which social logins are switched on, so a click on one that
// isn't set up shows a friendly message instead of Supabase's raw error page.
async function isProviderEnabled(provider: OAuthProvider) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        },
      },
    );
    if (!res.ok) return true; // can't tell; let Supabase decide
    const settings = await res.json();
    return Boolean(settings?.external?.[provider]);
  } catch {
    return true;
  }
}

export function SocialLogin() {
  const [showMore, setShowMore] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<OAuthProvider | null>(null);

  const signInWith = async (provider: OAuthProvider, label: string) => {
    setMessage(null);
    setBusy(provider);
    try {
      if (!(await isProviderEnabled(provider))) {
        setMessage(`${label} login isn't turned on yet.`);
        return;
      }
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/protected`,
        },
      });
      if (error) throw error;
      // On success the browser is sent to the provider's login page.
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex items-center justify-center gap-5">
        <button
          type="button"
          className={circle}
          aria-label="Continue with Google"
          disabled={busy !== null}
          onClick={() => signInWith("google", "Google")}
        >
          <FcGoogle className="h-7 w-7" />
        </button>
        <button
          type="button"
          className={circle}
          aria-label="Continue with Facebook"
          disabled={busy !== null}
          onClick={() => signInWith("facebook", "Facebook")}
        >
          <FaFacebookF className="h-6 w-6 text-white" />
        </button>
        <button
          type="button"
          className={circle}
          aria-label="Continue with Roblox"
          onClick={() => {
            // Supabase has no built-in Roblox login; this needs a custom
            // OAuth setup with Roblox's developer program.
            setMessage("Roblox login is coming soon.");
          }}
        >
          <SiRoblox className="h-6 w-6 text-neutral-200" />
        </button>
        <button
          type="button"
          className={circle}
          aria-label="More login options"
          aria-expanded={showMore}
          onClick={() => setShowMore((v) => !v)}
        >
          <FaEllipsisH className="h-6 w-6 text-white" />
        </button>
      </div>

      {showMore && (
        <div className="flex items-center justify-center gap-5">
          <button
            type="button"
            className={circle}
            aria-label="Continue with Discord"
            disabled={busy !== null}
            onClick={() => signInWith("discord", "Discord")}
          >
            <FaDiscord className="h-6 w-6 text-[#8c9eff]" />
          </button>
          <button
            type="button"
            className={circle}
            aria-label="Continue with Twitch"
            disabled={busy !== null}
            onClick={() => signInWith("twitch", "Twitch")}
          >
            <FaTwitch className="h-6 w-6 text-[#b38cff]" />
          </button>
        </div>
      )}

      {message && <AuthMessage kind="info">{message}</AuthMessage>}
    </div>
  );
}
