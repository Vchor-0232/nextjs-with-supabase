import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-ui";
import { SignUpForm } from "@/components/sign-up-form";
import { CreatePostForm } from "@/components/create-post-form";
import { createClient } from "@/lib/supabase/server";

// Logged-in users get the create-post form; everyone else signs up.
async function SignUpOrSubmit() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  return data?.claims ? (
    <CreatePostForm className="w-full text-foreground" />
  ) : (
    <SignUpForm />
  );
}

export default function Page() {
  return (
    <AuthShell>
      <Suspense>
        <SignUpOrSubmit />
      </Suspense>
    </AuthShell>
  );
}
