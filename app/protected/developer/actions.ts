"use server";

import { revalidatePath } from "next/cache";
import { fetchRobloxGames, ownsRobloxGame, placeIdFromUrl, type RobloxGameInfo } from "@/lib/roblox";
import { importSmallRobloxGames } from "@/lib/roblox-import";
import { syncRobloxStats } from "@/lib/roblox-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Server side of the Developer page. Every check runs here (again on
// submit), so the page can't be tricked into adding someone else's game.

export type GamePreview = {
  placeId: number;
  name: string;
  creator: string | null;
  ratingPct: number | null;
  playing: number;
  ownerVerified: boolean;
  existingGameId: string | null; // already on Gamesprout
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const MAX_PENDING = 5;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function signedInDeveloper() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;
  const { data: link } = await supabase
    .from("roblox_accounts")
    .select("roblox_user_id, roblox_username")
    .eq("user_id", data.claims.sub)
    .maybeSingle();
  return { supabase, userId: data.claims.sub, link };
}

function toPlaceId(input: string) {
  const trimmed = input.trim();
  if (/^\d{3,20}$/.test(trimmed)) return Number(trimmed);
  return placeIdFromUrl(trimmed.includes("roblox.com") ? trimmed : `roblox.com/${trimmed.replace(/^\/+/, "")}`);
}

async function lookUp(link: string, robloxUserId: number): Promise<Result<{ info: RobloxGameInfo; preview: GamePreview }>> {
  const placeId = toPlaceId(link);
  if (!placeId) {
    return { ok: false, error: "That doesn't look like a Roblox game link (roblox.com/games/123…)." };
  }
  const lookup = (await fetchRobloxGames([placeId])).get(placeId);
  if (!lookup?.ok) {
    return { ok: false, error: lookup?.error ?? "Couldn't reach Roblox. Try again in a minute." };
  }
  const info = lookup.info;

  let owner = false;
  try {
    owner = await ownsRobloxGame(info, robloxUserId);
  } catch {
    return { ok: false, error: "Couldn't check who owns this game on Roblox. Try again." };
  }

  const admin = createAdminClient();
  const { data: existing } = admin
    ? await admin
        .from("roblox_stats")
        .select("game_id")
        .or(`place_id.eq.${info.placeId},universe_id.eq.${info.universeId}`)
        .limit(1)
        .maybeSingle()
    : { data: null };

  const votes = info.upVotes + info.downVotes;
  return {
    ok: true,
    data: {
      info,
      preview: {
        placeId: info.placeId,
        name: info.name,
        creator: info.creatorName,
        ratingPct: votes ? Math.round((100 * info.upVotes) / votes) : null,
        playing: info.playing,
        ownerVerified: owner,
        existingGameId: (existing as { game_id: string } | null)?.game_id ?? null,
      },
    },
  };
}

export async function verifyGame(link: string): Promise<Result<GamePreview>> {
  const dev = await signedInDeveloper();
  if (!dev) return { ok: false, error: "Please log in again." };
  if (!dev.link) return { ok: false, error: "Connect your Roblox account first." };
  const res = await lookUp(link, Number(dev.link.roblox_user_id));
  return res.ok ? { ok: true, data: res.data.preview } : res;
}

export async function submitGame(input: {
  link: string;
  description: string;
  tags: string[];
  email: string;
  agreed: boolean;
}): Promise<Result<{ gameId: string }>> {
  const dev = await signedInDeveloper();
  if (!dev) return { ok: false, error: "Please log in again." };
  if (!dev.link) return { ok: false, error: "Connect your Roblox account first." };

  const description = input.description.trim();
  const email = input.email.trim();
  const tags = [...new Set(input.tags)].slice(0, 3);
  if (!description || description.length > 300) {
    return { ok: false, error: "Add a description (up to 300 characters)." };
  }
  if (!EMAIL.test(email) || email.length > 200) return { ok: false, error: "Enter a contact email." };
  if (!input.agreed) return { ok: false, error: "Please agree to the Terms and developer guidelines." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Submissions aren't set up on this server yet." };

  const { count } = await admin
    .from("game_submissions")
    .select("game_id", { count: "exact", head: true })
    .eq("user_id", dev.userId)
    .eq("status", "pending");
  if ((count ?? 0) >= MAX_PENDING) {
    return { ok: false, error: `You have ${MAX_PENDING} games waiting for review. Please wait for those first.` };
  }

  const found = await lookUp(input.link, Number(dev.link.roblox_user_id));
  if (!found.ok) return found;
  const { info, preview } = found.data;
  if (!preview.ownerVerified) {
    return { ok: false, error: `This game isn't owned by @${dev.link.roblox_username} on Roblox.` };
  }
  if (preview.existingGameId) return { ok: false, error: "This game is already on Gamesprout." };

  // The game waits unpublished until it's approved.
  const { data: game, error: gameError } = await admin
    .from("games")
    .insert({
      developer_id: dev.userId,
      title: info.name,
      description,
      roblox_url: `https://www.roblox.com/games/${info.placeId}`,
      is_published: false,
      source: "gamesprout",
    })
    .select("id")
    .single();
  if (gameError || !game) {
    console.error("Couldn't add game:", gameError?.message);
    return { ok: false, error: "Couldn't save your game. Try again." };
  }

  const [tagRows] = await Promise.all([
    tags.length ? admin.from("tags").select("id").in("name", tags) : Promise.resolve({ data: [] }),
  ]);
  const results = await Promise.all([
    admin.from("game_submissions").insert({
      game_id: game.id,
      user_id: dev.userId,
      roblox_universe_id: info.universeId,
      contact_email: email,
    }),
    (tagRows.data ?? []).length
      ? admin.from("game_tags").insert(
          (tagRows.data as { id: number }[]).map((t) => ({ game_id: game.id, tag_id: t.id })),
        )
      : Promise.resolve({ error: null }),
    // Roblox numbers and pictures, so the game page looks right in review.
    admin.from("roblox_stats").upsert({
      game_id: game.id,
      place_id: info.placeId,
      universe_id: info.universeId,
      name: info.name,
      description: info.description,
      creator_name: info.creatorName,
      creator_id: info.creatorId,
      creator_type: info.creatorType,
      visits: info.visits,
      playing: info.playing,
      favorites: info.favorites,
      up_votes: info.upVotes,
      down_votes: info.downVotes,
      icon_url: info.iconUrl,
      screenshot_urls: info.screenshotUrls,
      max_players: info.maxPlayers,
      roblox_created_at: info.createdAt,
      roblox_updated_at: info.updatedAt,
      synced_at: new Date().toISOString(),
    }),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error("Submission details failed:", failed.error.message);
    // Don't leave a half-saved game behind.
    await admin.from("games").delete().eq("id", game.id);
    return { ok: false, error: "Couldn't save your game. Try again." };
  }

  revalidatePath("/protected/developer");
  return { ok: true, data: { gameId: game.id } };
}

export async function disconnectRoblox(): Promise<Result<null>> {
  const dev = await signedInDeveloper();
  if (!dev) return { ok: false, error: "Please log in again." };
  const { error } = await dev.supabase.from("roblox_accounts").delete().eq("user_id", dev.userId);
  if (error) return { ok: false, error: "Couldn't disconnect. Try again." };
  revalidatePath("/protected/developer");
  return { ok: true, data: null };
}

// Admins (profiles.is_admin) approve or reject submitted games.
export async function reviewSubmission(gameId: string, approve: boolean): Promise<Result<null>> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { ok: false, error: "Please log in again." };
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", data.claims.sub)
    .maybeSingle();
  if (!me?.is_admin) return { ok: false, error: "Only admins can review games." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Reviews aren't set up on this server yet." };
  const [sub, game] = await Promise.all([
    admin
      .from("game_submissions")
      .update({ status: approve ? "approved" : "rejected" })
      .eq("game_id", gameId),
    admin.from("games").update({ is_published: approve }).eq("id", gameId),
  ]);
  if (sub.error || game.error) return { ok: false, error: "Couldn't save the review. Try again." };
  revalidatePath("/protected/developer");
  return { ok: true, data: null };
}

// Admins: search Roblox for more small games right now (instead of waiting
// for the daily update), then fill in their numbers and pictures.
export async function importMoreGames(): Promise<
  Result<{ imported: number; found: number; searched: string[]; note: string | null }>
> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { ok: false, error: "Please log in again." };
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", data.claims.sub)
    .maybeSingle();
  if (!me?.is_admin) return { ok: false, error: "Only admins can import games." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Imports aren't set up on this server yet." };

  try {
    // Up to ~35s of searching, leaving time to sync the new games.
    const result = await importSmallRobloxGames(admin, { searchMs: 35_000 });
    if (result.newGameIds.length) await syncRobloxStats(admin, result.newGameIds);
    revalidatePath("/protected", "layout");
    return {
      ok: true,
      data: {
        imported: result.imported,
        found: "smallGamesFound" in result ? (result.smallGamesFound ?? 0) : 0,
        searched: "searched" in result ? (result.searched ?? []) : [],
        note: "note" in result ? (result.note ?? null) : null,
      },
    };
  } catch (e) {
    console.error("Manual import failed:", e);
    return { ok: false, error: "Roblox didn't answer in time. Try again in a minute." };
  }
}
