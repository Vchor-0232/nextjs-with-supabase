import { Suspense } from "react";
import { SignUpForm } from "@/components/sign-up-form";
import { GameSubmitForm } from "@/components/game-submit-form";
import { createClient } from "@/lib/supabase/server";

// Logged-in users get the game submission form; everyone else signs up.
async function SignUpOrSubmit() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  return data?.claims ? <GameSubmitForm /> : <SignUpForm />;
}

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense>
          <SignUpOrSubmit />
        </Suspense>
      </div>
    </div>
  );
}
