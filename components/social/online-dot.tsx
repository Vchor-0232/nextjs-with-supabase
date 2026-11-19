import { cn } from "@/lib/utils";

// Small green dot on a friend's avatar when they're online.
export function OnlineDot({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Online"
      className={cn(
        "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-black bg-[#2bb673]",
        className,
      )}
    />
  );
}
