"use client";

import { createClient } from "@/lib/supabase/client";
import { AuthMessage } from "@/components/auth/auth-ui";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import {
  FaDiscord,
  FaEllipsisH,
  FaFacebook,
  FaTwitch,
} from "react-icons/fa";
import { SiRoblox } from "react-icons/si";

type OAuthProvider = "google" | "facebook" | "discord" | "twitch";

// Chunky "sticker" buttons from the design; every other one leans the
// other way.
const tile =
  "grid h-[54px] w-[54px] place-items-center border-2 border-white bg-black shadow-[0_4px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-[3px] hover:-rotate-2 hover:border-[#ffcc00] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffcc00]/40 disabled:opacity-60";
const circle = `${tile} rounded-[18px_18px_12px_18px]`;
const tilted = `${tile} rotate-2 rounded-[12px_18px_18px_18px]`;

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
    <div className="mb-[34px] flex w-full flex-col items-center gap-3.5">
      <div className="flex items-center justify-center gap-3.5">
        <button
          type="button"
          className={circle}
          aria-label="Continue with Google"
          disabled={busy !== null}
          onClick={() => signInWith("google", "Google")}
        >
          <FcGoogle className="h-[25px] w-[25px]" />
        </button>
        <button
          type="button"
          className={tilted}
          aria-label="Continue with Facebook"
          disabled={busy !== null}
          onClick={() => signInWith("facebook", "Facebook")}
        >
          <FaFacebook className="h-[25px] w-[25px] rounded-full bg-white text-[#1877f2]" />
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
          <SiRoblox className="h-[25px] w-[25px] text-white" />
        </button>
        <button
          type="button"
          className={tilted}
          aria-label="More login options"
          aria-expanded={showMore}
          onClick={() => setShowMore((v) => !v)}
        >
          <FaEllipsisH className="h-[22px] w-[22px] text-white" />
        </button>
      </div>

      {showMore && (
        <div className="flex items-center justify-center gap-3.5">
          <button
            type="button"
            className={circle}
            aria-label="Continue with Discord"
            disabled={busy !== null}
            onClick={() => signInWith("discord", "Discord")}
          >
            <FaDiscord className="h-[25px] w-[25px] text-[#8c9eff]" />
          </button>
          <button
            type="button"
            className={tilted}
            aria-label="Continue with Twitch"
            disabled={busy !== null}
            onClick={() => signInWith("twitch", "Twitch")}
          >
            <FaTwitch className="h-[25px] w-[25px] text-[#b38cff]" />
          </button>
        </div>
      )}

      {message && <AuthMessage kind="info">{message}</AuthMessage>}
    </div>
  );
}
