import { AuthShell } from "@/components/auth/auth-ui";
import Link from "next/link";

export default function Page() {
  return (
    <AuthShell tagline="One more step.">
      <div className="flex w-full flex-col items-center gap-4 text-center">
        <h2 className="text-2xl font-black">Check your email</h2>
        <p className="text-[13px] font-bold">
          You&apos;re almost in! We sent you a link. Click it to confirm your
          account, then log in.
        </p>
        <Link
          href="/auth/login"
          className="mt-4 font-black text-[#ffcc00] underline decoration-2 underline-offset-[3px]"
        >
          Back to log in
        </Link>
      </div>
    </AuthShell>
  );
}
