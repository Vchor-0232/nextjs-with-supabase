import * as React from "react";
import { GamesproutMark } from "@/components/gamesprout-mark";
import { cn } from "@/lib/utils";

// Log in / sign up look, from the Figma "Gamesprout Login" frame:
// blue page, a tilted dark card, black pill inputs and a yellow
// chunky button.

export function AuthShell({
  children,
  tagline = "Grow your next great game night.",
}: {
  children: React.ReactNode;
  tagline?: string;
}) {
  return (
    <main className="relative grid min-h-svh w-full place-items-center overflow-hidden bg-[#4d62db] px-6 py-8 text-white">
      {/* Background decoration: dashed circles and two yellow seeds. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-[174px] h-[300px] w-[300px] rounded-full border-2 border-dashed border-white/[0.12]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[138px] -left-[70px] h-[220px] w-[220px] rounded-full border-2 border-dashed border-white/[0.12]"
      />
      <Seed className="left-[7%] top-6 -rotate-12" />
      <Seed className="bottom-10 right-[9%] rotate-[70deg] bg-white" />

      <div className="relative w-[min(100%,500px)] px-5 py-7">
        {/* The card is a tilted layer behind the content. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 -rotate-[0.5deg] rounded-[42px_42px_28px_42px] border border-white/[0.14] bg-black/[0.16] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]"
        />
        <div className="relative flex flex-col">
          <GamesproutLogo />
          <p className="mb-[34px] mt-2 text-center text-[13px] font-extrabold">{tagline}</p>
          {children}
        </div>
      </div>
    </main>
  );
}

function Seed({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute h-[22px] w-3 rounded-[80%_20%_70%_30%] border-2 border-black bg-[#ffcc00]",
        className,
      )}
    />
  );
}

export function GamesproutLogo() {
  return (
    <h1 className="flex items-center justify-center gap-3 text-[40px] font-extrabold leading-none tracking-[-0.055em] [text-shadow:0_0_12px_#ffcc00]">
      Gamesprout
      <GamesproutMark className="-mt-2 w-[46px] shrink-0" />
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
      "h-14 w-full rounded-full border-2 border-white/[0.92] bg-black px-6 text-[13px] font-bold text-white shadow-[0_5px_0_rgba(0,0,0,0.14)] outline-none transition placeholder:text-white/[0.72] focus-visible:-translate-y-px focus-visible:border-[#ffcc00] focus-visible:shadow-[0_0_0_4px_rgba(255,204,0,0.25),0_5px_0_rgba(0,0,0,0.14)] disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
PillInput.displayName = "PillInput";

// The big yellow button with a hard black shadow that "presses" down.
export function AuthButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "min-h-14 w-full -rotate-[0.35deg] rounded-full border-2 border-black bg-[#ffcc00] text-base font-black text-black shadow-[0_6px_0_#000] transition hover:-translate-y-0.5 hover:rotate-[0.35deg] hover:shadow-[0_8px_0_#000] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60 active:translate-y-1 active:shadow-[0_2px_0_#000] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0",
        className,
      )}
      {...props}
    />
  );
}

export function AuthDivider({ label = "OR CONTINUE WITH" }: { label?: string }) {
  return (
    <div className="mb-6 mt-[34px] grid grid-cols-[1fr_auto_1fr] items-center gap-3.5 text-[13px] font-black tracking-[0.08em]">
      <span aria-hidden="true" className="h-0.5 bg-white/[0.88]" />
      {label}
      <span aria-hidden="true" className="h-0.5 bg-white/[0.88]" />
    </div>
  );
}

// "Don't have an account? Sign up" style line under the card's content.
export function AuthPrompt({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-[13px] font-bold [&_a]:font-black [&_a]:text-[#ffcc00] [&_a]:underline [&_a]:decoration-2 [&_a]:underline-offset-[3px]">
      {children}
    </p>
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
        "w-full rounded-2xl px-3 py-2 text-center text-[13px] font-bold",
        kind === "error" ? "bg-red-950/80 text-red-100" : "bg-black/40 text-white",
      )}
    >
      {children}
    </p>
  );
}
