import { z } from "zod";
import * as usersRepo from "@/lib/repositories/user.repository";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { phoneSchema } from "@/lib/utils/validators";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ phone: phoneSchema });

export async function POST(req: Request) {
  try {
    const limited = rateLimit(req, { key: "otp-send", limit: 5, windowMs: 60_000 });
    if (limited) return limited;

    const body = await req.json();
    const input = schema.parse(body);

    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;

    if (!authKey || !templateId) {
      return jsonBad("SMS service not configured", 500);
    }

    // Call MSG91 Send OTP API
    const mobile = `91${input.phone}`; // MSG91 requires country code prefix
    const msg91Url = `https://control.msg91.com/api/v5/otp?mobile=${mobile}&template_id=${templateId}&otp_length=6`;

    const msg91Res = await fetch(msg91Url, {
      method: "POST",
      headers: {
        authkey: authKey,
        "Content-Type": "application/json",
      },
    });

    const msg91Data = await msg91Res.json();

    if (!msg91Res.ok || msg91Data.type === "error") {
      console.error("MSG91 Send OTP Error:", msg91Data);
      return jsonBad(msg91Data?.message ?? "Failed to send OTP", 500);
    }

    // Upsert user (no OTP stored — MSG91 handles it)
    await usersRepo.upsertByPhone(input.phone);

    return jsonOk({ ok: true });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad("Server error", 500);
  }
}
