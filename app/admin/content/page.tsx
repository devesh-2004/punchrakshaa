"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import type { ContentPageDoc } from "@/lib/repositories/contentPage.repository";

export default function AdminContentPage() {
  const [pages, setPages] = useState<ContentPageDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/pages")
      .then((r) => r.json())
      .then((data) => {
        if (data.pages) setPages(data.pages);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (slug: string) => {
    if (!window.confirm(`Are you sure you want to delete "${slug}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/pages/${slug}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Page deleted successfully");
      setPages((prev) => prev.filter((x) => x.slug !== slug));
    } catch (err) {
      toast.error((err instanceof Error ? err.message : "Failed to delete page"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Informational Pages</h1>
        <Link 
          href="/admin/content/new" 
          className="flex items-center gap-2 bg-[#045830] hover:bg-[#034620] text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus size={20} /> Add Page
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Page Title</th>
                <th className="px-6 py-4">Slug / Path</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Loading pages...
                  </td>
                </tr>
              ) : pages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No pages found. Create About Us or Privacy Policy!
                  </td>
                </tr>
              ) : (
                pages.map((p) => (
                  <tr key={p.slug} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{p.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">/{p.slug}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {p.isPublished ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/admin/content/${p.slug}`} className="text-gray-400 hover:text-[#045830] transition">
                          <Edit size={18} />
                        </Link>
                        <button onClick={() => handleDelete(p.slug)} className="text-gray-400 hover:text-red-600 transition">
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
    </div>
  );
}
