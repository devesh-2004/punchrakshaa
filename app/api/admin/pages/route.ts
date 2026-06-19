import { requireAdmin } from "@/lib/utils/adminAuth";
import * as pagesRepo from "@/lib/repositories/contentPage.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const pages = await pagesRepo.find();
    return jsonOk({ pages });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const body = await req.json();

    // Check slug uniqueness
    const existing = await pagesRepo.findBySlug(body.slug);
    if (existing) return jsonBad("Page with this slug already exists", 400);

    const page = await pagesRepo.create(body);
    return jsonOk({ page });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
