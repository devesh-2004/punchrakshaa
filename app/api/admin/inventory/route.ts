import { z } from "zod";
import { requireAdmin } from "@/lib/utils/adminAuth";
import * as inventory from "@/lib/repositories/inventory.repository";
import { jsonBad, jsonOk, jsonZodError } from "@/lib/utils/api";
import { recordAdminAudit } from "@/lib/utils/audit";

export const dynamic = "force-dynamic";

// GET inventory rows. ?lowStock=true returns only at/below threshold;
// ?productId=<uuid> scopes to a single product.
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const lowStock = searchParams.get("lowStock") === "true";

    let items;
    if (productId) items = await inventory.listByProductId(productId);
    else if (lowStock) items = await inventory.listLowStock();
    else items = await inventory.list();

    return jsonOk({ inventory: items });
  } catch (err) {
    return jsonBad((err as Error).message, 500);
  }
}

const patchSchema = z.object({
  variantId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(0).optional(),
  reserved: z.coerce.number().int().min(0).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
});

// PATCH adjust stock for a single variant
export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonBad("Unauthorized", 401);

    const body = await req.json();
    const input = patchSchema.parse(body);

    const updated = await inventory.adjust(input.variantId, {
      quantity: input.quantity,
      reserved: input.reserved,
      lowStockThreshold: input.lowStockThreshold,
    });
    if (!updated) return jsonBad("Variant not found or nothing to update", 404);

    await recordAdminAudit(req, admin, {
      action: "inventory.adjust",
      entityType: "inventory",
      entityId: input.variantId,
      newValues: {
        quantity: input.quantity,
        reserved: input.reserved,
        lowStockThreshold: input.lowStockThreshold,
      },
    });

    return jsonOk({ inventory: updated });
  } catch (err) {
    const zod = jsonZodError(err);
    if (zod) return zod;
    return jsonBad((err as Error).message, 500);
  }
}
