"use client";

import Image from "next/image";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const REFERENCE_TEMPLATE = `
<h2>Introduction</h2>
<p>Start your introductory paragraph here. Describe the main problem the user might be facing and how this guide will help them resolve it.</p>
<h3>Key Benefits</h3>
<ul>
  <li>Benefit 1 - Provide clear formatting.</li>
  <li>Benefit 2 - Make it easy to read.</li>
  <li>Benefit 3 - Maintain engagement.</li>
</ul>
<h3>Deep Dive</h3>
<p>Explain the core concepts. Ensure you break down large chunks of text with relevant visuals.</p>
<blockquote>Health requires maintaining consistency every day.</blockquote>
<p>Final takeaways and conclusion here.</p>
`;

export function BlogForm({ existingBlog, duplicateSlug }: { existingBlog?: any; duplicateSlug?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [coverImageAlt, setCoverImageAlt] = useState("");
  const [author, setAuthor] = useState("");
  const [publishedAt, setPublishedAt] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (existingBlog) {
      setTitle(existingBlog.title || "");
      setSlug(existingBlog.slug || "");
      setExcerpt(existingBlog.excerpt || "");
      setContent(existingBlog.content || "");
      setCoverImage(existingBlog.coverImage || "");
      setCoverImageAlt(existingBlog.coverImageAlt || "");
      setAuthor(existingBlog.author || "");
      setPublishedAt(existingBlog.publishedAt ? new Date(existingBlog.publishedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    } else if (duplicateSlug) {
      // Fetch duplicate data
      fetch(`/api/admin/blogs/${duplicateSlug}`)
        .then(r => r.json())
        .then(data => {
          if (data.blog) {
             const b = data.blog;
             setTitle(b.title + " (Copy)");
             setSlug(b.slug + "-copy");
             setExcerpt(b.excerpt || "");
             setContent(b.content || "");
             setCoverImage(b.coverImage || "");
             setCoverImageAlt(b.coverImageAlt || "");
             setAuthor(b.author || "");
             setPublishedAt(new Date().toISOString().split("T")[0]);
          }
        })
        .catch(console.error);
    }
  }, [existingBlog, duplicateSlug]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCoverImage(data.url);
      toast.success("Image uploaded!");
    } catch (err) {
      toast.error((err instanceof Error ? err.message : "Failed to upload image"));
    } finally {
      setImageLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Convert current fields
    const body = { title, slug, excerpt, content, coverImage, coverImageAlt, author, publishedAt };
    
    try {
      const url = existingBlog 
        ? `/api/admin/blogs/${existingBlog.slug}`
        : "/api/admin/blogs";
        
      const method = existingBlog ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(existingBlog ? "Blog updated!" : "Blog created!");
      router.push("/admin/blogs");
      router.refresh();
    } catch (err) {
      toast.error((err instanceof Error ? err.message : "Something went wrong."));
    } finally {
      setLoading(false);
    }
  };

  const autoGenerateSlug = () => {
    if (!existingBlog && title && !slug) {
       setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    }
  };

  // Keep the slug URL-safe as it is typed (no spaces/special chars, which break
  // the /admin/blogs/[slug] edit + delete routes).
  const sanitizeSlug = (value: string) =>
    value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]+/g, "").replace(/-+/g, "-").replace(/^-/, "");

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Title <span className="text-red-500">*</span></label>
          <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={autoGenerateSlug} className="w-full border rounded-lg px-4 py-2" placeholder="Article Title" />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">URL Slug <span className="text-red-500">*</span></label>
          <input required type="text" value={slug} onChange={(e) => setSlug(sanitizeSlug(e.target.value))} className="w-full border rounded-lg px-4 py-2 bg-gray-50" placeholder="my-article-title" />
          <p className="text-xs text-gray-500">The URL path for this article.</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Excerpt / Short Description</label>
        <textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="w-full border rounded-lg px-4 py-2" placeholder="A brief summary for previews." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Author</label>
          <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full border rounded-lg px-4 py-2" placeholder="e.g. Admin" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Publish Date</label>
          <input required type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} className="w-full border rounded-lg px-4 py-2" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Cover Image</label>
        <div className="flex items-center gap-4">
          <input type="file" accept="image/*" onChange={handleImageUpload} disabled={imageLoading} className="w-full border rounded-lg px-4 py-2" />
          {coverImage && (
            <div className="relative h-12 w-12 shrink-0">
              <Image src={coverImage} alt="Preview" fill className="object-cover rounded" unoptimized />
            </div>
          )}
        </div>
        <input value={coverImage} onChange={(e) => setCoverImage(e.target.value)} className="w-full border rounded-lg px-4 py-2 mt-2 bg-gray-50 text-sm" placeholder="https://... (or upload file)" />
        <input value={coverImageAlt} onChange={(e) => setCoverImageAlt(e.target.value)} className="w-full border rounded-lg px-4 py-2 mt-2 text-sm" placeholder="Cover image alt text (for SEO)" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">Main Content (HTML) <span className="text-red-500">*</span></label>
          <button type="button" onClick={() => setContent(REFERENCE_TEMPLATE)} className="text-xs bg-gray-100 hover:bg-[#045830] hover:text-white text-gray-700 px-3 py-1.5 rounded font-medium transition cursor-pointer">
            + Insert Reference Template
          </button>
        </div>
        <textarea required rows={15} value={content} onChange={(e) => setContent(e.target.value)} className="w-full border rounded-lg px-4 py-3 font-mono text-sm leading-relaxed" placeholder="<h2>Your Title</h2><p>Article body...</p>" />
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <button disabled={loading || imageLoading} type="submit" className="bg-[#045830] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#034620] transition disabled:opacity-50 min-w-[120px]">
          {loading ? "Saving..." : existingBlog ? "Update Article" : "Publish Article"}
        </button>
      </div>
    </form>
  );
}
