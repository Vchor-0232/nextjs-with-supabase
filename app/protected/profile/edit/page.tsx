import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Narrow, PageTitle } from "@/components/home/app-chrome";
import { EditProfileForm } from "@/components/profile/edit-profile-form";
import { getMyProfile } from "@/lib/home-data";
import { createClient } from "@/lib/supabase/server";

async function EditProfileContent() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const profile = await getMyProfile(data.claims.sub);
  return <EditProfileForm userId={data.claims.sub} profile={profile} />;
}

export default function EditProfilePage() {
  return (
    <Narrow>
      <PageTitle>Edit profile</PageTitle>
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-2xl bg-neutral-900" />}
      >
        <EditProfileContent />
      </Suspense>
    </Narrow>
  );
}
