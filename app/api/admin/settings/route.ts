import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/adminAuth";
import { getGlobal, upsertGlobal } from "@/lib/repositories/siteSettings.repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getGlobal();
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const settings = await upsertGlobal({ consultation: body.consultation, badges: body.badges });
  return NextResponse.json({ settings });
}
