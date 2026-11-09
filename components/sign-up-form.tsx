"use client";

import {
  AuthButton,
  AuthDivider,
  AuthMessage,
  AuthPrompt,
  PillInput,
} from "@/components/auth/auth-ui";
import { SocialLogin } from "@/components/auth/social-login";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    const name = username.trim();
    // Matches the rules on the profiles table: 3–30 characters,
    // letters, numbers and underscores only.
    if (!/^[A-Za-z0-9_]{3,30}$/.test(name)) {
      setError(
        "Usernames must be 3–30 characters: letters, numbers and underscores only",
      );
      setIsLoading(false);
      return;
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      // Usernames are unique regardless of capitals ("Alex" = "alex").
      // ilike is case-insensitive; "_" is a wildcard there, so escape it.
      const { data: taken, error: lookupError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", name.replace(/_/g, "\\_"))
        .limit(1);
      if (lookupError) throw lookupError;
      if (taken.length > 0) {
        throw new Error("That username is taken. Try another one.");
      }

      // The on_auth_user_created trigger copies this username into profiles.
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/protected`,
          data: { username: name },
        },
      });
      if (error) {
        // Someone grabbed the username between our check and sign-up.
        if (error.message.includes("Database error saving new user")) {
          throw new Error("That username is taken. Try another one.");
        }
        throw error;
      }
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col">
      <form onSubmit={handleSignUp} className="flex w-full flex-col gap-3.5">
        <PillInput
          placeholder="Username"
          autoComplete="username"
          autoCapitalize="none"
          required
          minLength={3}
          maxLength={30}
          pattern="[A-Za-z0-9_]+"
          title="3–30 letters, numbers and underscores"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <PillInput
          type="email"
          placeholder="Email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PillInput
          type="password"
          placeholder="Password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PillInput
          type="password"
          placeholder="Confirm password"
          autoComplete="new-password"
          required
          value={repeatPassword}
          onChange={(e) => setRepeatPassword(e.target.value)}
        />
        {error && <AuthMessage>{error}</AuthMessage>}
        <AuthButton type="submit" disabled={isLoading} className="mt-3">
          {isLoading ? "Creating your account..." : "Sign up"}
        </AuthButton>
      </form>

      <AuthDivider />
      <SocialLogin />

      <AuthPrompt>
        Already have an account? <Link href="/auth/login">Log in</Link>
      </AuthPrompt>
    </div>
  );
}
