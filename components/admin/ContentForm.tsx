"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { ContentPageDoc } from "@/lib/repositories/contentPage.repository";

type Props = {
  initialData?: Partial<ContentPageDoc>;
  isEdit?: boolean;
};

export function ContentForm({ initialData = {}, isEdit = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [title, setTitle] = useState(initialData.title || "");
  const [slug, setSlug] = useState(initialData.slug || "");
  const [content, setContent] = useState(initialData.content || "");
  const [metaTitle, setMetaTitle] = useState(initialData.metaTitle || "");
  const [metaDesc, setMetaDesc] = useState(initialData.metaDescription || "");
  const [isPublished, setIsPublished] = useState(initialData.isPublished ?? true);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      title,
      slug,
      content,
      metaTitle,
      metaDescription: metaDesc,
      isPublished
    };

    try {
      const url = isEdit ? `/api/admin/pages/${slug}` : "/api/admin/pages";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save page");

      toast.success(isEdit ? "Page updated!" : "Page created!");
      router.push("/admin/content");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Page Title</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Privacy Policy" className="w-full border rounded-lg px-4 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
          <input required value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]+/g, "").replace(/-+/g, "-").replace(/^-/, ""))} placeholder="privacy-policy" readOnly={isEdit} className={`w-full border rounded-lg px-4 py-2 ${isEdit ? "bg-gray-100" : ""}`} />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input type="checkbox" id="publishToggle" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="w-5 h-5 text-[#045830] rounded focus:ring-0 cursor-pointer" />
        <label htmlFor="publishToggle" className="text-gray-900 font-medium cursor-pointer">Publish on website</label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Content (HTML allows formatting)</label>
        <textarea required value={content} onChange={(e) => setContent(e.target.value)} className="w-full border rounded-lg px-4 py-4 h-96 font-mono text-sm leading-relaxed" />
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-bold mb-4">SEO Data</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
            <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="w-full border rounded-lg px-4 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
            <input value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} className="w-full border rounded-lg px-4 py-2" />
          </div>
        </div>
      </div>

      <div className="border-t pt-6 flex justify-end gap-4">
        <button type="button" onClick={() => router.back()} className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition">Cancel</button>
        <button type="submit" disabled={loading} className="px-6 py-2 bg-[#045830] text-white rounded-lg hover:bg-[#034620] transition disabled:opacity-50">
          {loading ? "Saving..." : isEdit ? "Update Page" : "Create Page"}
        </button>
      </div>
    </form>
  );
}
