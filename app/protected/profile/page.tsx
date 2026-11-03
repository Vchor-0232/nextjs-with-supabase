/* eslint-disable @next/next/no-img-element -- avatars can come from any host */
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageTitle } from "@/components/home/app-chrome";
import { GamesproutLogoutButton } from "@/components/home/logout-button";
import { getMyProfile } from "@/lib/home-data";
import { createClient } from "@/lib/supabase/server";

async function ProfileCard() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const profile = await getMyProfile(data.claims.sub);
  const username = profile?.username ?? "player";

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-center">
      {profile?.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt=""
          className="h-24 w-24 rounded-full object-cover ring-4 ring-[#f5c518]"
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid h-24 w-24 place-items-center rounded-full bg-[#4d62db] text-4xl font-extrabold uppercase ring-4 ring-[#f5c518]"
        >
          {username.slice(0, 1)}
        </span>
      )}
      <div>
        <p className="text-xl font-bold">{profile?.display_name ?? username}</p>
        <p className="text-sm text-neutral-400">@{username}</p>
      </div>
      {profile?.bio && <p className="text-sm">{profile.bio}</p>}
      {profile?.roblox_username && (
        <p className="text-sm text-neutral-300">
          Roblox: <span className="font-bold">{profile.roblox_username}</span>
        </p>
      )}
      <p className="text-xs text-neutral-500">Editing your profile is coming soon.</p>
      <div className="mt-2 w-full">
        <GamesproutLogoutButton />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <>
      <PageTitle>Profile</PageTitle>
      <Suspense
        fallback={<div className="h-72 animate-pulse rounded-2xl bg-neutral-900" />}
      >
        <ProfileCard />
      </Suspense>
    </>
  );
}
