import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authorizationUrl } from "@/lib/strava";
import { setOauthState } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const inviteCode = request.nextUrl.searchParams.get("invite") ?? "";
  const state = randomBytes(32).toString("base64url");
  await setOauthState(state, inviteCode.trim() || undefined);
  return NextResponse.redirect(authorizationUrl(state));
}
