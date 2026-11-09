"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MyProfile } from "@/lib/home-data";

// Same rules as the profiles table, so the database never rejects a save.
const USERNAME = /^[A-Za-z0-9_]{3,30}$/;
const ROBLOX_USERNAME = /^[A-Za-z0-9_]{3,20}$/;
const BIO_MAX = 500;
const NAME_MAX = 50;

const field =
  "w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-[15px] text-white placeholder:text-neutral-500 focus-visible:border-[#4d62db] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4d62db]";
const label = "mb-1 block text-sm font-bold";
const hint = "mt-1 text-xs text-neutral-400";

export function EditProfileForm({
  userId,
  profile,
}: {
  userId: string;
  profile: MyProfile | null;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [robloxUsername, setRobloxUsername] = useState(
    profile?.roblox_username ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = username.trim();
    const roblox = robloxUsername.trim();
    if (!USERNAME.test(name)) {
      setError("Usernames must be 3–30 characters: letters, numbers and underscores only.");
      return;
    }
    if (roblox && !ROBLOX_USERNAME.test(roblox)) {
      setError("Roblox usernames are 3–20 characters: letters, numbers and underscores.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    try {
      // Usernames are unique ignoring capitals. "_" is a wildcard in ilike, so escape it.
      if (name.toLowerCase() !== (profile?.username ?? "").toLowerCase()) {
        const { data: taken, error: lookupError } = await supabase
          .from("profiles")
          .select("id")
          .ilike("username", name.replace(/_/g, "\\_"))
          .neq("id", userId)
          .limit(1);
        if (lookupError) throw lookupError;
        if (taken.length > 0) throw new Error("That username is taken. Try another one.");
      }

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({
          username: name,
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          roblox_username: roblox || null,
        })
        .eq("id", userId)
        .select("id");
      if (updateError) {
        if (updateError.code === "23505") {
          throw new Error("That username is taken. Try another one.");
        }
        throw updateError;
      }
      if (!data?.length) throw new Error("Couldn't save your profile. Try logging in again.");

      router.push("/protected/profile");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={save}
      className="flex flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
    >
      <div>
        <label htmlFor="display-name" className={label}>
          Display name
        </label>
        <input
          id="display-name"
          className={field}
          maxLength={NAME_MAX}
          placeholder={username || "Your name"}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <p className={hint}>Shown in big letters on your profile.</p>
      </div>

      <div>
        <label htmlFor="username" className={label}>
          Username
        </label>
        <div className="flex items-center rounded-xl border border-neutral-700 bg-neutral-900 focus-within:border-[#4d62db] focus-within:ring-2 focus-within:ring-[#4d62db]">
          <span className="pl-3 text-neutral-500">@</span>
          <input
            id="username"
            className="w-full bg-transparent px-1 py-2.5 text-[15px] text-white focus-visible:outline-none"
            required
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_]+"
            title="3–30 letters, numbers and underscores"
            autoCapitalize="none"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <p className={hint}>Letters, numbers and underscores. You can log in with it.</p>
      </div>

      <div>
        <label htmlFor="bio" className={label}>
          Bio
        </label>
        <textarea
          id="bio"
          className={`${field} min-h-24`}
          maxLength={BIO_MAX}
          placeholder="Co-op quests, late nights & one more round."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <p className={hint}>
          {bio.length}/{BIO_MAX}
        </p>
      </div>

      <div>
        <label htmlFor="roblox-username" className={label}>
          Roblox username <span className="font-normal text-neutral-400">(optional)</span>
        </label>
        <input
          id="roblox-username"
          className={field}
          maxLength={20}
          autoCapitalize="none"
          value={robloxUsername}
          onChange={(e) => setRobloxUsername(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-950/70 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Link
          href="/protected/profile"
          className="flex h-11 flex-1 items-center justify-center rounded-full border border-neutral-600 font-bold transition hover:bg-neutral-900"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="h-11 flex-1 rounded-full bg-[#ffcc00] font-bold text-black transition hover:bg-[#ffd84d] disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
