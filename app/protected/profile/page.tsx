import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageTitle } from "@/components/home/app-chrome";
import {
  FriendsSection,
  GameGridSection,
} from "@/components/home/home-sections";
import { BadgesSection, ProfileCard } from "@/components/profile/profile-sections";
import { getProfilePage } from "@/lib/home-data";
import { createClient } from "@/lib/supabase/server";

async function ProfileContent() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const page = await getProfilePage(data.claims.sub);

  return (
    <>
      {page.error && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-red-950/70 px-3 py-2 text-sm text-red-100"
        >
          Couldn&apos;t load everything: {page.error}
        </p>
      )}
      <ProfileCard
        profile={page.profile}
        friendCount={page.friendCount}
        followers={page.followers}
        following={page.following}
      />
      <FriendsSection friends={page.friends} count={page.friendCount} size="profile" />
      <GameGridSection
        title={`Favorite Games (${page.favoriteCount})`}
        games={page.favorites}
        emptyText="No favorite games yet."
      />
      <BadgesSection badges={page.badges} />
    </>
  );
}

export default function ProfilePage() {
  return (
    <>
      <PageTitle>Profile</PageTitle>
      <Suspense
        fallback={
          <div className="flex flex-col gap-4" aria-hidden="true">
            <div className="h-56 animate-pulse rounded-2xl bg-neutral-900" />
            <div className="h-28 animate-pulse rounded-2xl bg-neutral-900" />
            <div className="h-48 animate-pulse rounded-2xl bg-neutral-900" />
          </div>
        }
      >
        <ProfileContent />
      </Suspense>
    </>
  );
}
