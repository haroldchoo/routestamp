import { beforeEach, describe, expect, it } from "vitest";
import { createOauthState, verifyOauthState } from "@/lib/oauth-state";

beforeEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = "https://routestamp.example";
  process.env.SESSION_SECRET = "s".repeat(32);
  process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  process.env.STRAVA_CLIENT_ID = "12345";
  process.env.STRAVA_CLIENT_SECRET = "private-client-secret";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
});

describe("OAuth state", () => {
  it("verifies a signed state without an invite", () => {
    const state = createOauthState();
    expect(verifyOauthState(state)).toEqual({ inviteCode: undefined });
  });

  it("round-trips the encrypted invite code", () => {
    const state = createOauthState(" invite-code ");
    expect(verifyOauthState(state)).toEqual({ inviteCode: "invite-code" });
  });

  it("rejects a tampered state", () => {
    const state = createOauthState();
    expect(verifyOauthState(`${state}tampered`)).toBeNull();
  });
});
