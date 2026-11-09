"use client";

import { loginWithUsername } from "@/app/auth/login/actions";
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
    <div className="flex w-full flex-col">
      <form onSubmit={handleLogin} className="flex w-full flex-col">
        <div className="flex flex-col gap-3.5">
          <PillInput
            placeholder="Username / Email / Phone"
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
        </div>
        <Link
          href="/auth/forgot-password"
          className="mb-[26px] ml-auto mr-[5px] mt-[15px] text-[13px] font-extrabold underline-offset-[3px] hover:underline"
        >
          Forgot password?
        </Link>
        {error && <div className="-mt-3 mb-4"><AuthMessage>{error}</AuthMessage></div>}
        <AuthButton type="submit" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Log in"}
        </AuthButton>
      </form>

      <AuthDivider />
      <SocialLogin />

      <AuthPrompt>
        Don&apos;t have an account? <Link href="/auth/sign-up">Sign up</Link>
      </AuthPrompt>
    </div>
  );
}
