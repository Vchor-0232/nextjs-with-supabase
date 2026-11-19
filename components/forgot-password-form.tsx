"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthButton, AuthMessage, AuthPrompt, PillInput } from "@/components/auth/auth-ui";
import { ResetSteps } from "@/components/auth/reset-steps";
import { createClient } from "@/lib/supabase/client";

// Forgot password, steps 1 and 2: enter your email, then check your inbox.
// Supabase allows one reset email a minute, so Resend waits that long.
const RESEND_WAIT = 60;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async (address: string) => {
    setIsLoading(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(address, {
      // Must be in Supabase's Redirect URLs (Authentication > URL Configuration).
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    setIsLoading(false);
    if (error) {
      setError(
        error.status === 429
          ? "Too many tries. Please wait a minute and try again."
          : "Couldn't send the email. Check the address and try again.",
      );
      return;
    }
    // Same message whether or not the email has an account, so the page
    // can't be used to find out who's signed up.
    setSentTo(address);
    setWait(RESEND_WAIT);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(email.trim());
  };

  const mmss = `${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, "0")}`;

  if (sentTo) {
    return (
      <div className="flex flex-col items-center text-center">
        <ResetSteps at={1} />
        <div
          role="status"
          className="mb-5 w-full rounded-[22px] border-2 border-dashed border-[#ffcc00]/70 bg-black/30 px-4 py-5"
        >
          <p className="text-lg font-black">
            Link sent! <span aria-hidden="true">📬</span>
          </p>
          <p className="mt-1 break-words text-[13px] font-bold text-white/80">
            If <span className="text-[#ffcc00]">{sentTo}</span> has a Gamesprout account, a reset
            link is on its way. Open the newest email and tap the link once.
          </p>
        </div>
        {error && (
          <div className="mb-4 w-full">
            <AuthMessage>{error}</AuthMessage>
          </div>
        )}
        <AuthButton type="button" onClick={() => send(sentTo)} disabled={isLoading || wait > 0}>
          {isLoading ? "Sending..." : wait > 0 ? `Resend email in ${mmss}` : "Resend email"}
        </AuthButton>
        <button
          type="button"
          onClick={() => {
            setSentTo(null);
            setError(null);
          }}
          className="mb-6 mt-5 text-[13px] font-extrabold text-white/70 underline-offset-[3px] hover:text-white hover:underline"
        >
          Use a different email
        </button>
        <AuthPrompt>
          <Link href="/auth/login">Back to log in</Link>
        </AuthPrompt>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      <ResetSteps at={0} />
      <PillInput
        type="email"
        placeholder="Email on your account"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <ul className="mb-6 mt-4 flex flex-col gap-1.5 rounded-[18px] border border-white/15 bg-black/25 px-4 py-3 text-[12px] font-bold text-white/80">
        <li><span aria-hidden="true">🌱 </span>Use the email you signed up with</li>
        <li><span aria-hidden="true">📬 </span>Check spam if it doesn&apos;t show up</li>
        <li><span aria-hidden="true">⏱️ </span>The link works once, for 1 hour</li>
      </ul>
      {error && (
        <div className="mb-4">
          <AuthMessage>{error}</AuthMessage>
        </div>
      )}
      <AuthButton type="submit" disabled={isLoading}>
        {isLoading ? "Sending..." : "Send reset link"}
      </AuthButton>
      <div className="mt-[26px]">
        <AuthPrompt>
          Remembered it? <Link href="/auth/login">Back to log in</Link>
        </AuthPrompt>
      </div>
    </form>
  );
}
