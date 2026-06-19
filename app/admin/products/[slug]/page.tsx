import { ProductForm } from "@/components/admin/ProductForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as products from "@/lib/repositories/product.repository";
import { requireAdmin } from "@/lib/utils/adminAuth";

export default async function EditProductPage({ params }: { params: { slug: string } }) {
  const admin = await requireAdmin();
  if (!admin) return <div>Unauthorized</div>;

  const product = await products.findBySlug(params.slug);
  if (!product) return notFound();

  // Convert MongoDB ObjectId to string for client component props
  const serialized = JSON.parse(JSON.stringify(product));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products" className="p-2 hover:bg-gray-200 rounded-full transition">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit Product: {product.name}</h1>
      </div>
      <ProductForm initialData={serialized} isEdit />
    </div>
  );
}
