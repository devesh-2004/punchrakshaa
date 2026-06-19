import { z } from "zod";
import { requireAuth } from "@/lib/utils/customerAuth";
import { signAuthToken, setAuthCookie } from "@/lib/auth";
import * as usersRepo from "@/lib/repositories/user.repository";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";
import { phoneSchema } from "@/lib/utils/validators";

export async function POST(req: Request) {
  const limited = rateLimit(req, { key: "user-phone-post", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const auth = requireAuth();
    if (!auth) return jsonBad("Unauthorized", 401);

    const { phone } = z.object({ phone: phoneSchema }).parse(await req.json());

    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    if (!authKey || !templateId) return jsonBad("SMS service not configured", 500);

    const existing = await usersRepo.findByPhone(phone, auth.userId);
    if (existing) return jsonBad("Phone number already in use by another account", 400);

    const mobile = `91${phone}`;
    const res = await fetch(
      `https://control.msg91.com/api/v5/otp?mobile=${mobile}&template_id=${templateId}&otp_length=6`,
      { method: "POST", headers: { authkey: authKey, "Content-Type": "application/json" } },
    );
    const data = await res.json() as { type?: string; message?: string };
    if (!res.ok || data.type === "error") {
      return jsonBad(data?.message ?? "Failed to send OTP", 500);
    }
    return jsonOk({ ok: true });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad("Server error", 500);
  }
}

export async function PATCH(req: Request) {
  const limited = rateLimit(req, { key: "user-phone-patch", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const auth = requireAuth();
    if (!auth) return jsonBad("Unauthorized", 401);

    const { phone, otp } = z
      .object({
        phone: phoneSchema,
        otp: z.string().trim().regex(/^\d{6}$/, { message: "Invalid OTP" }),
      })
      .parse(await req.json());

    const authKey = process.env.MSG91_AUTH_KEY;
    if (!authKey) return jsonBad("SMS service not configured", 500);

    const mobile = `91${phone}`;
    const verifyRes = await fetch(
      `https://control.msg91.com/api/v5/otp/verify?mobile=${mobile}&otp=${otp}`,
      { method: "GET", headers: { authkey: authKey } },
    );
    const verifyData = await verifyRes.json() as { type?: string; message?: string };
    if (!verifyRes.ok || verifyData.type !== "success") {
      return jsonBad(verifyData?.message ?? "Invalid OTP", 400);
    }

    const existing = await usersRepo.findByPhone(phone, auth.userId);
    if (existing) return jsonBad("Phone number already in use by another account", 400);

    const user = await usersRepo.updateById(auth.userId, { phone }, { safe: true });
    if (!user) return jsonBad("User not found", 404);

    const token = signAuthToken({ userId: String(user._id), phone: user.phone });
    setAuthCookie(token);
    return jsonOk({ user });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad("Server error", 500);
  }
}
