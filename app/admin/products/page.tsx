"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Archive, ArchiveRestore, Copy } from "lucide-react";
import type { ProductDoc } from "@/lib/repositories/product.repository";
import toast from "react-hot-toast";

type ConfirmModalState = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmText?: string;
  danger?: boolean;
};

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ConfirmModalState>({ isOpen: false, title: "", message: "", onConfirm: () => {} });
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = () => {
    setLoading(true);
    fetch("/api/admin/products", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.products) setProducts(data.products);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleDelete = (slug: string) => {
    setModal({
      isOpen: true,
      title: "Delete Product",
      message: `Are you sure you want to completely delete "${slug}"? This action cannot be undone.`,
      confirmText: "Delete",
      danger: true,
      onConfirm: async () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/admin/products/${slug}`, { method: "DELETE", credentials: "include" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          toast.success("Product deleted successfully");
          fetchProducts();
        } catch (err) {
          toast.error((err instanceof Error ? err.message : "Failed to delete product"));
        }
      }
    });
  };

  const handleToggleArchive = (slug: string, isArchived: boolean) => {
    const action = isArchived ? "unarchive" : "archive";
    setModal({
      isOpen: true,
      title: `${isArchived ? "Unarchive" : "Archive"} Product`,
      message: `Are you sure you want to ${action} "${slug}"?`,
      confirmText: isArchived ? "Unarchive" : "Archive",
      danger: false,
      onConfirm: async () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/admin/products/${slug}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ isArchived: !isArchived }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          toast.success(`Product ${action}d successfully`);
          fetchProducts();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : `Failed to ${action} product`);
        }
      }
    });
  };
  
  const handleClone = async (slug: string) => {
    const loadingToast = toast.loading("Cloning product...");
    try {
      const res = await fetch(`/api/admin/products/${slug}/clone`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success("Product cloned! Redirecting to edit page...", { id: loadingToast });
      
      // Redirect to the edit page of the new product
      router.push(`/admin/products/${data.newSlug}`);
    } catch (err) {
      toast.error((err instanceof Error ? err.message : "Failed to clone product"), { id: loadingToast });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <Link 
          href="/admin/products/new" 
          className="flex items-center gap-2 bg-[#045830] hover:bg-[#034620] text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus size={20} /> Add Product
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4 text-center">Price</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No products found. Add a new one!
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.slug} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      <div className="text-sm text-gray-500">{p.slug}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-medium text-gray-900">₹{p.price}</div>
                      {p.discountedPrice < p.price && (
                        <div className="text-xs text-red-500 font-medium">Sale: ₹{p.discountedPrice}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center space-x-2">
                      {p.inStock ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          In Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Out of Stock
                        </span>
                      )}
                      {p.isArchived && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800 mt-1 sm:mt-0">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => handleToggleArchive(p.slug, !!p.isArchived)}
                          className={`${p.isArchived ? "text-amber-500 hover:text-amber-600" : "text-gray-400 hover:text-amber-500"} transition`}
                          title={p.isArchived ? "Unarchive" : "Archive"}
                        >
                          {p.isArchived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                        </button>
                        <Link href={`/admin/products/${p.slug}`} className="text-gray-400 hover:text-[#045830] transition" title="Edit">
                          <Edit size={18} />
                        </Link>
                        <button 
                          onClick={() => handleClone(p.slug)}
                          className="text-gray-400 hover:text-blue-500 transition"
                          title="Clone Product"
                        >
                          <Copy size={18} />
                        </button>
                        <button onClick={() => handleDelete(p.slug)} className="text-gray-400 hover:text-red-600 transition" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{modal.title}</h3>
            <p className="text-gray-600 mb-6">{modal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={modal.onConfirm}
                className={`px-4 py-2 rounded-lg font-medium text-white transition ${
                  modal.danger ? "bg-red-600 hover:bg-red-700" : "bg-[#045830] hover:bg-[#034620]"
                }`}
              >
                {modal.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
