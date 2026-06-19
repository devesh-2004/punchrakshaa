import { z } from "zod";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { phoneSchema } from "@/lib/utils/validators";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ phone: phoneSchema });

export async function POST(req: Request) {
  try {
    const limited = rateLimit(req, { key: "otp-resend", limit: 5, windowMs: 60_000 });
    if (limited) return limited;

    const body = await req.json();
    const input = schema.parse(body);

    const authKey = process.env.MSG91_AUTH_KEY;

    if (!authKey) {
      return jsonBad("SMS service not configured", 500);
    }

    // Call MSG91 Resend OTP API
    const mobile = `91${input.phone}`;
    const resendUrl = `https://control.msg91.com/api/v5/otp/retry?mobile=${mobile}&retrytype=text`;

    const resendRes = await fetch(resendUrl, {
      method: "POST",
      headers: { authkey: authKey },
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok || resendData.type === "error") {
      console.error("MSG91 Resend OTP Error:", resendData);
      return jsonBad(resendData?.message ?? "Failed to resend OTP", 500);
    }

    return jsonOk({ ok: true });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad("Server error", 500);
  }
}
