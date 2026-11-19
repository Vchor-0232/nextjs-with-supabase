"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { PillInput } from "@/components/auth/auth-ui";

// A password box with an eye button to show what's typed. Helpful on
// phones, where saved passwords and tiny keyboards cause silent typos.
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type">
>(({ className, ...props }, ref) => {
  const [shown, setShown] = React.useState(false);
  return (
    <div className="relative">
      <PillInput
        ref={ref}
        type={shown ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`pr-14 ${className ?? ""}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffcc00]"
      >
        {shown ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";
