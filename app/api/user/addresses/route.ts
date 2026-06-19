import { z } from "zod";
import { requireAuth } from "@/lib/utils/customerAuth";
import * as usersRepo from "@/lib/repositories/user.repository";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { rateLimit } from "@/lib/rate-limit";
import { phoneSchema } from "@/lib/utils/validators";

const addressInputSchema = z.object({
  fullName: z.string().trim().min(2, { message: "Name required" }),
  phone: phoneSchema,
  addressLine1: z.string().trim().min(10, { message: "Address too short" }),
  addressLine2: z.string().trim().optional().default(""),
  city: z.string().trim().min(1, { message: "City required" }),
  state: z.string().trim().min(1, { message: "State required" }),
  pincode: z.string().trim().regex(/^\d{6}$/, { message: "Invalid pincode" }),
  isDefault: z.boolean().optional().default(false),
});

export async function GET(req: Request) {
  const limited = rateLimit(req, { key: "user-addresses-get", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const auth = requireAuth();
    if (!auth) return jsonBad("Unauthorized", 401);
    const addresses = await usersRepo.getAddresses(auth.userId);
    return jsonOk({ addresses });
  } catch (err) {
    return jsonBad((err as Error).message || "Server error", 500);
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, { key: "user-addresses-post", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const auth = requireAuth();
    if (!auth) return jsonBad("Unauthorized", 401);

    const input = addressInputSchema.parse(await req.json());
    const addresses = await usersRepo.addAddress(auth.userId, {
      label: input.city || input.addressLine1,
      fullName: input.fullName,
      phone: input.phone,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 ?? "",
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      isDefault: input.isDefault,
    });
    return jsonOk({ addresses });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad("Server error", 500);
  }
}
