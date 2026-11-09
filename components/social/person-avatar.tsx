/* eslint-disable @next/next/no-img-element -- avatars can come from any host */
import type { Person } from "@/lib/social-shared";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-9 w-9 text-sm",
  md: "h-12 w-12 text-lg",
  lg: "h-[88px] w-[88px] text-4xl ring-[3px] ring-[#ffcc00]",
};

export function PersonAvatar({
  person,
  size = "md",
  className,
}: {
  person: Pick<Person, "username" | "avatarUrl">;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const box = cn(SIZES[size], "shrink-0 rounded-full", className);
  return person.avatarUrl ? (
    <img src={person.avatarUrl} alt="" className={cn(box, "object-cover")} />
  ) : (
    <span
      aria-hidden="true"
      className={cn(box, "grid place-items-center bg-[#4d62db] font-extrabold uppercase")}
    >
      {person.username.slice(0, 1)}
    </span>
  );
}
