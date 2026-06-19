import { requireAdmin } from "@/lib/utils/adminAuth";
import * as blogsRepo from "@/lib/repositories/blog.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";
import { recordAdminAudit } from "@/lib/utils/audit";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const blog = await blogsRepo.findBySlug(params.slug);
    if (!blog) return jsonBad("Not Found", 404);

    return jsonOk({ blog });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}

export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const body = await req.json();

    if (body.slug && body.slug !== params.slug) {
      const existing = await blogsRepo.findBySlug(body.slug);
      if (existing) return jsonBad("Another blog with this slug already exists", 400);
    }

    const blog = await blogsRepo.updateBySlug(params.slug, body);

    if (!blog) return jsonBad("Not Found", 404);
    await recordAdminAudit(req, admin, {
      action: "blog.update",
      entityType: "blog",
      entityId: String(blog._id),
      newValues: { slug: blog.slug, title: blog.title },
    });
    return jsonOk({ blog });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}

export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const ok = await blogsRepo.deleteBySlug(params.slug);
    if (!ok) return jsonBad("Not Found", 404);

    await recordAdminAudit(req, admin, {
      action: "blog.delete",
      entityType: "blog",
      entityId: params.slug,
      oldValues: { slug: params.slug },
    });

    return jsonOk({ success: true });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
