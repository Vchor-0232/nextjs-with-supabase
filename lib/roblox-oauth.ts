import { createHash, randomBytes } from "node:crypto";

// "Connect Roblox account": Roblox's OAuth 2.0 sign-in (authorization code
// with PKCE). We only ask for "openid profile", which gives the Roblox user
// ID, username and avatar, and can't change anything on the account.
// Needs an app registered at create.roblox.com > OAuth 2.0 Apps, with its
// keys in Vercel as ROBLOX_OAUTH_CLIENT_ID and ROBLOX_OAUTH_CLIENT_SECRET.

const AUTHORIZE = "https://apis.roblox.com/oauth/v1/authorize";
const TOKEN = "https://apis.roblox.com/oauth/v1/token";
const USERINFO = "https://apis.roblox.com/oauth/v1/userinfo";

export const STATE_COOKIE = "gs_roblox_state";
export const VERIFIER_COOKIE = "gs_roblox_verifier";

export function robloxOAuthConfig() {
  const clientId = process.env.ROBLOX_OAUTH_CLIENT_ID;
  const clientSecret = process.env.ROBLOX_OAUTH_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

const base64url = (buf: Buffer) => buf.toString("base64url");

export function newPkce() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge, state: base64url(randomBytes(16)) };
}

export function authorizeUrl(clientId: string, redirectUri: string, state: string, challenge: string) {
  const url = new URL(AUTHORIZE);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile",
    response_type: "code",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  })
    .toString()
    .replace(/\+/g, "%20"); // "openid profile", spelled the way Roblox's docs show it
  return url.toString();
}

export type RobloxUser = {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

// Swaps the code Roblox sent back for a token, then asks who signed in.
export async function robloxUserFromCode(
  code: string,
  verifier: string,
  redirectUri: string,
): Promise<RobloxUser> {
  const config = robloxOAuthConfig();
  if (!config) throw new Error("Roblox sign-in isn't set up");

  const tokenRes = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) throw new Error(`Roblox token request failed (${tokenRes.status})`);
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) throw new Error("Roblox didn't return a token");

  const infoRes = await fetch(USERINFO, {
    headers: { Authorization: `Bearer ${access_token}` },
    cache: "no-store",
  });
  if (!infoRes.ok) throw new Error(`Roblox user info failed (${infoRes.status})`);
  const info = (await infoRes.json()) as {
    sub?: string;
    preferred_username?: string;
    nickname?: string;
    name?: string;
    picture?: string | null;
  };
  const id = Number(info.sub);
  if (!Number.isSafeInteger(id) || id <= 0 || !info.preferred_username) {
    throw new Error("Roblox didn't say who signed in");
  }
  return {
    id,
    username: info.preferred_username,
    displayName: info.nickname ?? info.name ?? null,
    avatarUrl: info.picture ?? null,
  };
}
