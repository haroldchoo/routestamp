import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { createInvite } from "@/lib/repository";

export const runtime = "nodejs";

type InviteRequest = {
  expiresInDays?: unknown;
};

export async function POST(request: Request) {
  const env = serverEnv();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!env.inviteAdminSecret) return NextResponse.json({ error: "Invite admin secret is not configured" }, { status: 500 });
  if (token !== env.inviteAdminSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readBody(request);
  const expiresInDays = Number(body.expiresInDays ?? 30);
  try {
    return NextResponse.json(await createInvite(expiresInDays), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create invite" }, { status: 500 });
  }
}

async function readBody(request: Request): Promise<InviteRequest> {
  try {
    return (await request.json()) as InviteRequest;
  } catch {
    return {};
  }
}
