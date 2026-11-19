import { Mail, MailCheck, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

// The 3-step tracker on the password reset pages:
// Enter email → Check inbox → New password. Done steps are yellow, the
// current one glows, later ones are dimmed.
const STEPS = [
  { icon: Mail, label: "Enter email" },
  { icon: MailCheck, label: "Check inbox" },
  { icon: Sprout, label: "New password" },
];

export function ResetSteps({ at }: { at: 0 | 1 | 2 }) {
  return (
    <ol aria-label="Password reset steps" className="mb-7 grid grid-cols-3 gap-2">
      {STEPS.map(({ icon: Icon, label }, i) => (
        <li
          key={label}
          aria-current={i === at ? "step" : undefined}
          className="relative flex flex-col items-center gap-1.5"
        >
          {/* Line from the previous step's circle to this one, behind both. */}
          {i > 0 && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute right-1/2 top-[19px] z-0 h-[3px] w-[calc(100%+0.5rem)] rounded-full",
                i <= at ? "bg-[#ffcc00]" : "bg-white/25",
              )}
            />
          )}
          <span
            className={cn(
              "relative z-10 grid h-10 w-10 place-items-center rounded-full border-2",
              i < at && "border-black bg-[#ffcc00] text-black",
              i === at && "border-[#ffcc00] bg-black text-[#ffcc00] shadow-[0_0_12px_rgba(255,204,0,0.7)]",
              i > at && "border-white/30 bg-[#3a4cb4] text-white/50",
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <span className={cn("text-[11px] font-extrabold", i <= at ? "text-white" : "text-white/55")}>
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}
