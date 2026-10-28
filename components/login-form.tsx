"use client";

import { loginWithUsername } from "@/app/auth/login/actions";
import {
  AuthButton,
  AuthDivider,
  AuthMessage,
  PillInput,
} from "@/components/auth/auth-ui";
import { SocialLogin } from "@/components/auth/social-login";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PHONE_PATTERN = /^\+?[\d\s().-]{7,}$/;

export function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const id = identifier.trim();
    try {
      if (id.includes("@")) {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
          email: id,
          password,
        });
        if (error) throw error;
      } else if (PHONE_PATTERN.test(id)) {
        // Phone login needs an SMS provider set up in Supabase first.
        throw new Error(
          "Phone login isn't available yet. Use your username or email.",
        );
      } else {
        const { error } = await loginWithUsername(id, password);
        if (error) throw new Error(error);
      }
      router.push("/protected");
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-center">
      <form onSubmit={handleLogin} className="flex w-full flex-col gap-5">
        <PillInput
          placeholder="Username or Email"
          autoComplete="username"
          autoCapitalize="none"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <PillInput
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <AuthMessage>{error}</AuthMessage>}
        <AuthButton type="submit" disabled={isLoading} className="mt-1">
          {isLoading ? "Logging in..." : "Log in"}
        </AuthButton>
        <Link
          href="/auth/forgot-password"
          className="-mt-1 self-center text-sm font-semibold underline-offset-4 hover:underline"
        >
          Forgot your password?
        </Link>
      </form>

      <AuthDivider />
      <SocialLogin />

      <p className="mt-10 text-sm font-semibold">
        New to Gamesprout?{" "}
        <Link
          href="/auth/sign-up"
          className="font-bold text-black underline underline-offset-4"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
