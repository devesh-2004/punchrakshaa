import { jsonBad, jsonOk } from "@/lib/utils/api";
import { signAuthToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const limited = rateLimit(req, { key: "admin-login", limit: 10, windowMs: 60_000 });
    if (limited) return limited;

    const { email, password } = await req.json();

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "nanobananasanjayshah@gmail.com";
    const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "Juice123!!";

    if (email.toLowerCase() === adminEmail.toLowerCase() && password === adminPass) {
      const token = signAuthToken({ userId: "admin", role: "admin", email });
      const res = jsonOk({ success: true });
      
      // Using raw Response Headers to absolutely guarantee Set-Cookie is transmitted by AWS Amplify
      const secureFlag = process.env.NODE_ENV === "production" ? "Secure;" : "";
      res.headers.append(
        "Set-Cookie", 
        `punchraksha_token=${token}; Path=/; Max-Age=${60 * 60 * 24 * 7}; HttpOnly; SameSite=Lax; ${secureFlag}`
      );
      
      return res;
    }

    return jsonBad("Invalid credentials", 401);
  } catch (err) {
    return jsonBad((err as Error).message, 400);
  }
}
