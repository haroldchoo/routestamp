import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { serverEnv } from "@/lib/env";

const stateLifetimeSeconds = 10 * 60;

export function createOauthState(inviteCode?: string) {
  const issuedAt = Math.floor(Date.now() / 1000).toString(36);
  const nonce = randomBytes(24).toString("base64url");
  const encryptedInvite = inviteCode?.trim() ? Buffer.from(encryptSecret(inviteCode.trim()), "utf8").toString("base64url") : "";
  const payload = [issuedAt, nonce, encryptedInvite].join(".");
  return `${payload}.${sign(payload)}`;
}

export function verifyOauthState(value: string | null) {
  if (!value) return null;
  const [issuedAtValue, nonce, encryptedInvite, signature] = value.split(".");
  if (!issuedAtValue || !nonce || encryptedInvite === undefined || !signature) return null;

  const payload = [issuedAtValue, nonce, encryptedInvite].join(".");
  const expectedSignature = Buffer.from(sign(payload));
  const actualSignature = Buffer.from(signature);
  if (expectedSignature.length !== actualSignature.length || !timingSafeEqual(expectedSignature, actualSignature)) return null;

  const issuedAt = Number.parseInt(issuedAtValue, 36);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(issuedAt) || issuedAt > now + 60 || now - issuedAt > stateLifetimeSeconds) return null;

  if (!encryptedInvite) return { inviteCode: undefined };
  try {
    return { inviteCode: decryptSecret(Buffer.from(encryptedInvite, "base64url").toString("utf8")) };
  } catch {
    return null;
  }
}

function sign(value: string) {
  return createHmac("sha256", serverEnv().sessionSecret).update(value).digest("base64url");
}
