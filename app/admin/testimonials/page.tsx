"use client";

import { useEffect, useRef, useState } from "react";
import SafeImage from "@/components/common/SafeImage";
import { toast } from "react-hot-toast";
import { Plus, Pencil, Trash2, X, ChevronUp, ChevronDown, Youtube, Upload, Loader2, Check, Monitor } from "lucide-react";

interface Testimonial {
  _id: string;
  image: string;
  imageAlt: string;
  videoId: string;
  customerName: string;
  order: number;
  isActive: boolean;
}

const EMPTY_FORM = { image: "", imageAlt: "", videoId: "", customerName: "", isActive: true };

export default function AdminTestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Testimonial | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [imgUploading, setImgUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/testimonials");
      const data = await res.json();
      if (data.testimonials) setItems(data.testimonials);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch_(); }, []);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setModalMode("add");
  };

  const openEdit = (t: Testimonial) => {
    setForm({ image: t.image, imageAlt: t.imageAlt || "", videoId: t.videoId, customerName: t.customerName, isActive: t.isActive });
    setEditTarget(t);
    setModalMode("edit");
  };

  const handleImageUpload = async (file: File) => {
    setImgUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setForm((f) => ({ ...f, image: data.url }));
        toast.success("Image uploaded");
      } else {
        toast.error(data.error || "Upload failed");
      }
    } finally {
      setImgUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.image) { toast.error("Please upload or enter an image"); return; }
    if (!form.videoId.trim()) { toast.error("YouTube Video ID is required"); return; }

    setSaving(true);
    try {
      const isEdit = modalMode === "edit" && editTarget;
      const res = await fetch(
        isEdit ? `/api/admin/testimonials/${editTarget._id}` : "/api/admin/testimonials",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (data.testimonial) {
        toast.success(isEdit ? "Testimonial updated" : "Testimonial added");
        setModalMode(null);
        fetch_();
      } else {
        toast.error(data.error || "Failed");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;
    const res = await fetch(`/api/admin/testimonials/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { toast.success("Deleted"); fetch_(); }
    else toast.error(data.error || "Failed");
  };

  const handleToggle = async (t: Testimonial) => {
    const res = await fetch(`/api/admin/testimonials/${t._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    const data = await res.json();
    if (data.testimonial) {
      setItems((prev) => prev.map((i) => i._id === t._id ? { ...i, isActive: !t.isActive } : i));
    }
  };

  const handleMove = async (index: number, dir: -1 | 1) => {
    const swapIdx = index + dir;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const updated = [...items];
    [updated[index], updated[swapIdx]] = [updated[swapIdx], updated[index]];
    setItems(updated);

    await Promise.all([
      fetch(`/api/admin/testimonials/${updated[index]._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: index }),
      }),
      fetch(`/api/admin/testimonials/${updated[swapIdx]._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: swapIdx }),
      }),
    ]);
  };

  const ytThumb = (videoId: string) =>
    videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Testimonials</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} testimonial{items.length !== 1 ? "s" : ""} · <span className="text-green-600 font-medium">{items.filter(t => t.isActive).length} shown on homepage</span></p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#045830] text-white rounded-lg hover:bg-[#034524] transition font-medium"
        >
          <Plus size={18} /> Add Testimonial
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <Youtube size={40} className="opacity-40" />
          <p>No testimonials yet. Add your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {items.map((t, i) => (
            <div
              key={t._id}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col transition-opacity ${!t.isActive ? "opacity-50" : ""}`}
            >
              {/* Thumbnail */}
              <div className="relative aspect-[9/16] bg-gray-100 overflow-hidden">
                <SafeImage
                  src={t.image || ytThumb(t.videoId)}
                  alt={t.customerName || "Testimonial"}
                  fill
                  className="object-cover"
                  fallbackSrc={ytThumb(t.videoId) || undefined}
                />
                {/* Homepage badge */}
                <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${t.isActive ? "bg-green-500 text-white" : "bg-gray-400 text-white"}`}>
                  {t.isActive ? <><Check size={10} /> On Homepage</> : "Not Showing"}
                </div>
                {/* YouTube ID badge */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1 bg-black/60 rounded-md px-2 py-1">
                  <Youtube size={12} className="text-red-400 shrink-0" />
                  <span className="text-white text-xs font-mono truncate">{t.videoId}</span>
                </div>
              </div>

              {/* Info */}
              <div className="p-3 flex-1 flex flex-col gap-2">
                <p className="font-medium text-gray-800 text-sm truncate">
                  {t.customerName || <span className="text-gray-400 italic">No name</span>}
                </p>

                {/* Homepage toggle — primary action */}
                <button
                  onClick={() => handleToggle(t)}
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    t.isActive
                      ? "bg-green-50 border-green-300 text-green-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                  }`}
                >
                  <Monitor size={13} />
                  {t.isActive ? "Showing on Homepage" : "Add to Homepage"}
                </button>

                {/* Actions row */}
                <div className="flex items-center gap-1 mt-auto pt-1">
                  {/* Reorder */}
                  <button onClick={() => handleMove(i, -1)} disabled={i === 0} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30">
                    <ChevronUp size={15} />
                  </button>
                  <button onClick={() => handleMove(i, 1)} disabled={i === items.length - 1} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30">
                    <ChevronDown size={15} />
                  </button>

                  <div className="flex-1" />

                  {/* Edit */}
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500">
                    <Pencil size={15} />
                  </button>
                  {/* Delete */}
                  <button onClick={() => handleDelete(t._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">
                {modalMode === "add" ? "Add Testimonial" : "Edit Testimonial"}
              </h3>
              <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thumbnail Image *
                </label>

                {/* Preview */}
                {form.image && (
                  <div className="relative w-full aspect-[9/16] max-w-[160px] mx-auto mb-3 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                    <SafeImage src={form.image} alt="preview" fill className="object-cover" />
                  </div>
                )}

                {/* Upload button */}
                <div className="flex gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={imgUploading}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    {imgUploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                    {imgUploading ? "Uploading..." : "Upload Image"}
                  </button>
                  <span className="text-gray-400 self-center text-sm">or</span>
                  <input
                    type="text"
                    value={form.image}
                    onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                    placeholder="Paste image URL"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#045830] transition"
                  />
                </div>
              </div>

              {/* YouTube Video ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  YouTube Video ID *
                </label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-[#045830] transition">
                  <Youtube size={16} className="text-red-500 shrink-0" />
                  <input
                    type="text"
                    value={form.videoId}
                    onChange={(e) => setForm((f) => ({ ...f, videoId: e.target.value.trim() }))}
                    placeholder="e.g. dQw4w9WgXcQ"
                    className="flex-1 text-sm outline-none"
                  />
                </div>
                {form.videoId && (
                  <p className="text-xs text-gray-400 mt-1">
                    Preview: youtube.com/watch?v={form.videoId}
                  </p>
                )}
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#045830] transition"
                />
              </div>

              {/* Thumbnail Image Alt Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thumbnail Image Alt Text <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.imageAlt}
                  onChange={(e) => setForm((f) => ({ ...f, imageAlt: e.target.value }))}
                  placeholder="e.g. Customer testimonial about Constipation Relief Powder"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#045830] transition"
                />
                <p className="text-xs text-gray-400 mt-1">Used for accessibility and SEO. Falls back to customer name if empty.</p>
              </div>

              {/* Homepage toggle */}
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 accent-[#045830]"
                />
                <Monitor size={15} className="text-gray-500" />
                Show on homepage
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || imgUploading}
                  className="flex-1 px-4 py-2 bg-[#045830] text-white rounded-lg text-sm font-medium hover:bg-[#034524] transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : modalMode === "add" ? "Add Testimonial" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
