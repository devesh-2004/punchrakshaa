import { NextResponse } from "next/server";
import * as usersRepo from "@/lib/repositories/user.repository";
import { setAuthCookie, signAuthToken } from "@/lib/auth";
import { z } from "zod";

// ⚠️  DEV-ONLY — this route is completely disabled in production.
// It bypasses Firebase OTP so you can test the full customer flow locally.

const schema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Must be a 10-digit phone number"),
});

export async function POST(req: Request) {
  // Hard-block unless explicitly in dev mode
  if (process.env.NEXT_PUBLIC_NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { phone } = schema.parse(body);

    const user = await usersRepo.upsertByPhone(phone);

    const token = signAuthToken({ userId: String(user._id), phone: user.phone });
    setAuthCookie(token);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const zodMsg = err instanceof Error && "issues" in err
      ? (err as { issues: { message: string }[] }).issues?.[0]?.message
      : undefined;
    return NextResponse.json(
      { error: zodMsg ?? (err instanceof Error ? err.message : "Dev login failed") },
      { status: 400 },
    );
  }
}
