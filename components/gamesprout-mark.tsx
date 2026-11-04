/* eslint-disable @next/next/no-img-element -- a tiny static SVG; next/image adds nothing here */
import { cn } from "@/lib/utils";

// The Gamesprout logo: a sprout breaking out of a game controller.
// The artwork lives in /public/gamesprout-mark.svg (and app/icon.svg for the
// browser tab). It's black, so use it on the blue background.
export function GamesproutMark({ className }: { className?: string }) {
  return (
    <img
      src="/gamesprout-mark.svg"
      alt=""
      aria-hidden="true"
      width={120}
      height={100}
      className={cn("h-auto select-none", className)}
      draggable={false}
    />
  );
}
