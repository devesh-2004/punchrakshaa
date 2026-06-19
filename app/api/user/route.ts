import { z } from "zod";
import { requireAuth } from "@/lib/utils/customerAuth";
import * as usersRepo from "@/lib/repositories/user.repository";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const limited = rateLimit(req, { key: "user-get", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = requireAuth();
  if (!auth) return jsonBad("Unauthorized", 401);

  const user = await usersRepo.findById(auth.userId, { safe: true });
  if (!user) return jsonBad("User not found", 404);
  return jsonOk({ user });
}

export async function PATCH(req: Request) {
  const limited = rateLimit(req, { key: "user-patch", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const auth = requireAuth();
    if (!auth) return jsonBad("Unauthorized", 401);

    const body = await req.json();
    const input = z.object({ name: z.string().trim().min(1).max(80) }).parse(body);

    const user = await usersRepo.updateById(auth.userId, { name: input.name }, { safe: true });
    if (!user) return jsonBad("User not found", 404);
    return jsonOk({ user });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad("Server error", 500);
  }
}
