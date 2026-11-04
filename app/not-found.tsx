import Link from "next/link";
import { AppChrome, PageTitle } from "@/components/home/app-chrome";

// Shown for any page that doesn't exist, such as a deleted or unpublished game.
export default function NotFound() {
  return (
    <AppChrome variant="public">
      <PageTitle>Not found</PageTitle>
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-center">
        <p className="font-bold">We couldn&apos;t find that page.</p>
        <p className="mt-1 text-sm text-neutral-400">
          The game may have been removed or isn&apos;t published yet.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex h-10 items-center rounded-full bg-[#f5c518] px-5 font-bold text-black transition hover:bg-[#ffd633]"
        >
          Back to Gamesprout
        </Link>
      </div>
    </AppChrome>
  );
}
