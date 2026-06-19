import { ProductForm } from "@/components/admin/ProductForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products" className="p-2 hover:bg-gray-200 rounded-full transition">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
      </div>
      <ProductForm />
    </div>
  );
}
