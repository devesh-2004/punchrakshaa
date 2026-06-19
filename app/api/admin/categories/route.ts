import { requireAdmin } from "@/lib/utils/adminAuth";
import * as categories from "@/lib/repositories/category.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { recordAdminAudit } from "@/lib/utils/audit";

export const dynamic = "force-dynamic";

// GET all categories
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const docs = await categories.find();
    return jsonOk({ categories: docs });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}

// POST create (or upsert) a category by name
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) return jsonBad("Category name is required", 400);

    const category = await categories.create(name);
    await recordAdminAudit(req, admin, {
      action: "category.create",
      entityType: "category",
      entityId: String(category._id),
      newValues: { name: category.name, slug: category.slug },
    });
    return jsonOk({ category });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
