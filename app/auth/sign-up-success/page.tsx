import { AuthShell } from "@/components/auth/auth-ui";
import Link from "next/link";

export default function Page() {
  return (
    <AuthShell>
      <div className="flex w-full flex-col items-center gap-4 text-center">
        <h2 className="text-2xl font-bold">Check your email</h2>
        <p className="font-semibold">
          You&apos;re almost in! We sent you a link. Click it to confirm your
          account, then log in.
        </p>
        <Link
          href="/auth/login"
          className="mt-4 font-bold text-black underline underline-offset-4"
        >
          Back to log in
        </Link>
      </div>
    </AuthShell>
  );
}
