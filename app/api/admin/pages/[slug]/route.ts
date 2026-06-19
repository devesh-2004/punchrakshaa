import { requireAdmin } from "@/lib/utils/adminAuth";
import * as pagesRepo from "@/lib/repositories/contentPage.repository";
import { jsonBad, jsonOk } from "@/lib/utils/api";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const page = await pagesRepo.findBySlug(params.slug);
    if (!page) return jsonBad("Not Found", 404);

    return jsonOk({ page });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}

export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const body = await req.json();

    const page = await pagesRepo.updateBySlug(params.slug, body);

    if (!page) return jsonBad("Not Found", 404);
    return jsonOk({ page });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}

export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const ok = await pagesRepo.deleteBySlug(params.slug);
    if (!ok) return jsonBad("Not Found", 404);

    return jsonOk({ success: true });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}
