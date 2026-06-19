"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import type { BlogDoc } from "@/lib/repositories/blog.repository";

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState<BlogDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/blogs")
      .then((r) => r.json())
      .then((data) => {
        if (data.blogs) setBlogs(data.blogs);
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
      const res = await fetch(`/api/admin/blogs/${slug}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Blog deleted successfully");
      setBlogs((prev) => prev.filter((x) => x.slug !== slug));
    } catch (err) {
      toast.error((err instanceof Error ? err.message : "Failed to delete blog"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Blogs</h1>
        <Link 
          href="/admin/blogs/new" 
          className="flex items-center gap-2 bg-[#045830] hover:bg-[#034620] text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus size={20} /> Write Article
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Author</th>
                <th className="px-6 py-4">Published Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Loading blogs...
                  </td>
                </tr>
              ) : blogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No articles found. Write your first blog!
                  </td>
                </tr>
              ) : (
                blogs.map((b) => (
                  <tr key={b.slug} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{b.title}</div>
                      <div className="text-sm text-gray-500">{b.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700">{b.author}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(b.publishedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/admin/blogs/new?clone=${b.slug}`} title="Duplicate" className="text-gray-400 hover:text-blue-600 transition">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </Link>
                        <Link href={`/admin/blogs/${b.slug}`} title="Edit" className="text-gray-400 hover:text-[#045830] transition">
                          <Edit size={18} />
                        </Link>
                        <button onClick={() => handleDelete(b.slug)} title="Delete" className="text-gray-400 hover:text-red-600 transition">
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
