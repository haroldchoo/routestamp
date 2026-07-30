import { NextResponse } from "next/server";
import { createInvite } from "@/lib/repository";
import { requireSession } from "@/lib/request-auth";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  try {
    return NextResponse.json(await createInvite(30), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create invite" }, { status: 500 });
  }
}
