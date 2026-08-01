import { NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { createOauthState } from "@/lib/oauth-state";
import { authorizationUrl } from "@/lib/strava";
import { setOauthState } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const appUrl = serverEnv().appUrl;
  const inviteCode = request.nextUrl.searchParams.get("invite") ?? "";

  // OAuth state is stored in a host-only cookie. Start the flow on the same
  // canonical origin that Strava uses for the callback so Vercel aliases do
  // not strand the cookie on a different host.
  if (request.nextUrl.origin !== appUrl) {
    const canonicalUrl = new URL("/api/auth/strava", appUrl);
    if (inviteCode.trim()) canonicalUrl.searchParams.set("invite", inviteCode.trim());
    return NextResponse.redirect(canonicalUrl);
  }

  const state = createOauthState(inviteCode);
  await setOauthState(state, inviteCode.trim() || undefined);
  return NextResponse.redirect(authorizationUrl(state));
}
