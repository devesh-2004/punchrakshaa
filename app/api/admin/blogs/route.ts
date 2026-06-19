import { requireAdmin } from "@/lib/utils/adminAuth";
import * as blogsRepo from "@/lib/repositories/blog.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { recordAdminAudit } from "@/lib/utils/audit";

// GET all blogs
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const blogs = await blogsRepo.find();
    return jsonOk({ blogs });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}

// POST new blog
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const body = await req.json();

    // Check slug uniqueness
    const existing = await blogsRepo.findBySlug(body.slug);
    if (existing) return jsonBad("Blog with this slug already exists", 400);

    const blog = await blogsRepo.create(body);
    await recordAdminAudit(req, admin, {
      action: "blog.create",
      entityType: "blog",
      entityId: String(blog._id),
      newValues: { slug: blog.slug, title: blog.title },
    });
    return jsonOk({ blog });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
