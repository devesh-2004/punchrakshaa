import { z } from "zod";
import * as reviewsRepo from "@/lib/repositories/review.repository";
import { rateLimit } from "@/lib/rate-limit";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { phoneSchema } from "@/lib/utils/validators";

const reviewSchema = z.object({
  productId: z.string().trim().min(1, "Product ID required"),
  guestName: z.string().trim().min(1).max(80).optional().default(""),
  guestPhone: phoneSchema.optional().default(""),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().default(""),
  reviewBody: z.string().trim().min(5, "Review body is too short").max(2000),
});

export async function POST(req: Request) {
  const limited = rateLimit(req, { key: "reviews-create", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const input = reviewSchema.parse(body);

    const review = await reviewsRepo.create({
      productId: input.productId,
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      rating: input.rating,
      title: input.title,
      body: input.reviewBody,
      status: "pending",
    });

    return jsonOk({ success: true, review }, { status: 201 });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    console.error("Error creating review:", err);
    return jsonBad((err as Error).message || "Failed to create review", 500);
  }
}
