import { z } from "zod";
import * as usersRepo from "@/lib/repositories/user.repository";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { phoneSchema } from "@/lib/utils/validators";
import { setAuthCookie, signAuthToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  phone: phoneSchema,
  otp: z.string().trim().regex(/^\d{6}$/, "Invalid OTP"),
});

export async function POST(req: Request) {
  try {
    const limited = rateLimit(req, { key: "otp-verify", limit: 10, windowMs: 60_000 });
    if (limited) return limited;

    const body = await req.json();
    const input = schema.parse(body);

    const authKey = process.env.MSG91_AUTH_KEY;

    if (!authKey) {
      return jsonBad("SMS service not configured", 500);
    }

    // Call MSG91 Verify OTP API
    const mobile = `91${input.phone}`;
    const verifyUrl = `https://control.msg91.com/api/v5/otp/verify?mobile=${mobile}&otp=${input.otp}`;

    const verifyRes = await fetch(verifyUrl, {
      method: "GET",
      headers: { authkey: authKey },
    });

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || verifyData.type !== "success") {
      console.error("MSG91 Verify OTP Error:", verifyData);
      return jsonBad(verifyData?.message ?? "Invalid OTP", 400);
    }

    // Find or create user and issue auth token
    const user = await usersRepo.upsertByPhone(input.phone);

    const token = signAuthToken({ userId: String(user._id), phone: user.phone });
    setAuthCookie(token);

    return jsonOk({ ok: true });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad("Server error", 500);
  }
}
