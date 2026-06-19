import * as usersRepo from "@/lib/repositories/user.repository";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { setAuthCookie, signAuthToken } from "@/lib/auth";
import { firebaseAdmin } from "@/lib/firebase/admin";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  idToken: z.string().min(1, "idToken is required"),
});

export async function POST(req: Request) {
  try {
    const limited = rateLimit(req, { key: "firebase-verify", limit: 10, windowMs: 60_000 });
    if (limited) return limited;

    const body = await req.json();
    const { idToken } = schema.parse(body);

    // Verify the Firebase ID token
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    
    // Firebase returns phone number with country code (e.g., +919999999999)
    const fullPhone = decodedToken.phone_number;
    
    if (!fullPhone) {
      return jsonBad("No phone number attached to this Firebase credential", 400);
    }

    // Strip the +91 prefix to match our DB format (10 digits)
    // Assumes India numbers for this project based on +91 usage
    const phone = fullPhone.startsWith("+91") ? fullPhone.slice(3) : fullPhone.replace(/\D/g, "").slice(-10);

    // Find or create user and issue auth token
    const user = await usersRepo.upsertByPhone(phone);

    const token = signAuthToken({ userId: String(user._id), phone: user.phone });
    setAuthCookie(token);

    return jsonOk({ ok: true });
  } catch (err) {
    console.error("Firebase verify error:", err);
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad(err instanceof Error ? err.message : "Invalid Firebase token", 401);
  }
}
