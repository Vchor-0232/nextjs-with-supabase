"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthButton, AuthMessage, AuthPrompt } from "@/components/auth/auth-ui";
import { ResetSteps } from "@/components/auth/reset-steps";
import { PasswordInput } from "@/components/auth/password-input";
import { createClient } from "@/lib/supabase/client";

// Step 3: the reset email's link signs you in and lands here to pick a new
// password.
export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<React.ReactNode>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return setError("Use at least 6 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");

    setIsLoading(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    setIsLoading(false);
    if (!error) return router.push("/protected");

    if (error.name === "AuthSessionMissingError" || error.status === 401) {
      setError(
        <>
          This reset link has expired or was already used.{" "}
          <Link href="/auth/forgot-password" className="font-black text-[#ffcc00] underline">
            Send a new one
          </Link>
        </>,
      );
    } else if (error.code === "same_password") {
      setError("That's your current password. Pick a new one.");
    } else if (error.code === "weak_password") {
      setError("That password is too easy to guess. Try a longer one.");
    } else {
      setError("Couldn't save your password. Try again.");
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      <ResetSteps at={2} />
      <div className="flex flex-col gap-3.5">
        <PasswordInput
          placeholder="New password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordInput
          placeholder="Type it again"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <p className="mb-6 mt-3 px-2 text-center text-[12px] font-bold text-white/70">
        At least 6 characters. Longer is stronger! <span aria-hidden="true">🌱</span>
      </p>
      {error && (
        <div className="mb-4">
          <AuthMessage>{error}</AuthMessage>
        </div>
      )}
      <AuthButton type="submit" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save new password"}
      </AuthButton>
      <div className="mt-[26px]">
        <AuthPrompt>
          <Link href="/auth/login">Back to log in</Link>
        </AuthPrompt>
      </div>
    </form>
  );
}
