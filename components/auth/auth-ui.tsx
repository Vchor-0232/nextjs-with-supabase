import * as React from "react";
import { Gamepad2, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

// Gamesprout style tile (from the Figma login screen).
// Background #4d62db, sprout green #84b952, black controls, white text.

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh w-full justify-center bg-[#4d62db] px-6 py-16 text-white sm:py-24">
      <div className="flex w-full max-w-[340px] flex-col items-center">
        <GamesproutLogo />
        {children}
      </div>
    </main>
  );
}

export function GamesproutLogo() {
  return (
    <h1 className="mb-8 flex items-center gap-2 text-[2.5rem] font-bold leading-none tracking-tight text-black">
      Gamesprout
      {/* Approximation of the gamepad-and-sprout mark. Swap in the real
          logo file from Figma (e.g. /public/logo.svg) when it's exported. */}
      <span className="relative inline-flex pt-3" aria-hidden="true">
        <Gamepad2 className="h-11 w-11" strokeWidth={2.5} />
        <Sprout
          className="absolute -top-2 left-1/2 h-7 w-7 -translate-x-1/2 text-[#84b952]"
          strokeWidth={2.75}
        />
      </span>
    </h1>
  );
}

// Black pill input. The placeholder doubles as the visible label (as in the
// design), so we also set aria-label for screen readers.
export const PillInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, placeholder, ...props }, ref) => (
  <input
    ref={ref}
    placeholder={placeholder}
    aria-label={props["aria-label"] ?? placeholder}
    className={cn(
      "h-12 w-full rounded-full border border-white/70 bg-black px-4 text-[15px] font-bold text-white shadow-[0_4px_6px_rgba(0,0,0,0.35)] transition placeholder:font-bold placeholder:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
PillInput.displayName = "PillInput";

export function AuthButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "h-9 w-full rounded-[3px] border border-white/60 bg-black text-[15px] font-bold text-white shadow-[0_4px_6px_rgba(0,0,0,0.35)] transition hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function AuthDivider() {
  return (
    // Slightly wider than the form (as in the design), but never wider
    // than the screen minus a small margin.
    <hr className="my-10 h-1 w-[min(calc(100%+3.5rem),calc(100vw-2rem))] shrink-0 rounded-full border-0 bg-white" />
  );
}

export function AuthMessage({
  kind = "error",
  children,
}: {
  kind?: "error" | "info";
  children: React.ReactNode;
}) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "w-full rounded-lg px-3 py-2 text-center text-sm font-semibold",
        kind === "error" ? "bg-red-950/70 text-red-100" : "bg-black/40 text-white",
      )}
    >
      {children}
    </p>
  );
}
