"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, X, Trash2, Plus, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "react-hot-toast";

type ReviewStatus = "pending" | "approved" | "rejected";

interface ReviewItem {
  _id: string;
  guestName: string;
  guestPhone: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  addedByAdmin: boolean;
  isVerified: boolean;
  createdAt: string;
  productId: { _id: string; name: string; slug: string } | null;
}

const TABS: { label: string; value: string }[] = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "all" },
];

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-[2px]">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={s <= value ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
        />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const [tab, setTab] = useState("pending");
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Add review modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [products, setProducts] = useState<{ _id: string; name: string }[]>([]);
  const [addForm, setAddForm] = useState({
    productId: "",
    guestName: "",
    guestPhone: "",
    rating: 5,
    title: "",
    reviewBody: "",
    isVerified: true,
    createdAt: "",
  });
  const [addLoading, setAddLoading] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?status=${tab}&page=${page}`);
      const data = await res.json();
      if (data.reviews) {
        setReviews(data.reviews);
        setTotal(data.total);
        setPendingCount(data.pendingCount);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);
  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => { setPage(1); }, [tab]);

  const fetchProducts = async () => {
    const res = await fetch("/api/admin/products");
    const data = await res.json();
    if (data.products) setProducts(data.products);
  };

  const openAddModal = () => {
    setAddForm({
      productId: "",
      guestName: "",
      guestPhone: "",
      rating: 5,
      title: "",
      reviewBody: "",
      isVerified: true,
      createdAt: new Date().toLocaleDateString('en-CA'),
    });
    setShowAddModal(true);
  };

  const handleStatusChange = async (id: string, status: ReviewStatus) => {
    setActionLoading(id + status);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.review) {
        toast.success(`Review ${status}`);
        fetchReviews();
      } else {
        toast.error(data.error || "Failed");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this review permanently?")) return;
    setActionLoading(id + "delete");
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Review deleted");
        fetchReviews();
      } else {
        toast.error(data.message || "Failed");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.productId || !addForm.guestName || !addForm.reviewBody) {
      toast.error("Please fill all required fields");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (data.review) {
        toast.success("Review added successfully");
        setShowAddModal(false);
        if (tab === "approved" || tab === "all") fetchReviews();
        else setTab("approved");
      } else {
        toast.error(data.error || "Failed to add review");
      }
    } finally {
      setAddLoading(false);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-orange-600 font-medium mt-1">
              {pendingCount} review{pendingCount > 1 ? "s" : ""} awaiting approval
            </p>
          )}
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#045830] text-white rounded-lg hover:bg-[#034524] transition font-medium"
        >
          <Plus size={18} />
          Add Review
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`relative px-5 py-3 text-sm font-medium transition-colors ${
              tab === t.value
                ? "text-[#045830] border-b-2 border-[#045830]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {t.value === "pending" && pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-orange-500 text-white rounded-full">
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">Loading...</div>
        ) : reviews.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-400">No reviews found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 w-[160px]">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 w-[100px]">Rating</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Review</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 w-[140px]">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 w-[90px]">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 w-[90px]">Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reviews.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{r.guestName || "—"}</p>
                      {r.guestPhone && <p className="text-xs text-gray-400">{r.guestPhone}</p>}
                      {r.addedByAdmin && (
                        <span className="text-xs text-purple-600 font-medium">by admin</span>
                      )}
                      {r.isVerified && (
                        <span className="text-xs text-green-600 font-medium block">✓ verified</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StarDisplay value={r.rating} />
                    </td>
                    <td className="px-4 py-3 max-w-[280px]">
                      {r.title && <p className="font-medium text-gray-800 mb-1 truncate">{r.title}</p>}
                      <p className="text-gray-600 line-clamp-2">{r.body}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 text-xs leading-tight">
                        {r.productId?.name || <span className="text-gray-400">Unknown</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        r.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : r.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-orange-100 text-orange-700"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(r.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {r.status !== "approved" && (
                          <button
                            onClick={() => handleStatusChange(r._id, "approved")}
                            disabled={actionLoading === r._id + "approved"}
                            title="Approve"
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition disabled:opacity-50"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        {r.status !== "rejected" && (
                          <button
                            onClick={() => handleStatusChange(r._id, "rejected")}
                            disabled={actionLoading === r._id + "rejected"}
                            title="Reject"
                            className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 transition disabled:opacity-50"
                          >
                            <X size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(r._id)}
                          disabled={actionLoading === r._id + "delete"}
                          title="Delete"
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Add Review Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-[500px] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Add Review</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                <select
                  value={addForm.productId}
                  onChange={(e) => setAddForm((f) => ({ ...f, productId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#045830] transition"
                  required
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    value={addForm.guestName}
                    onChange={(e) => setAddForm((f) => ({ ...f, guestName: e.target.value }))}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#045830] transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={addForm.guestPhone}
                    onChange={(e) => setAddForm((f) => ({ ...f, guestPhone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    placeholder="10-digit number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#045830] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review Date *</label>
                <input
                  type="date"
                  value={addForm.createdAt}
                  onChange={(e) => setAddForm((f) => ({ ...f, createdAt: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#045830] transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating *</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setAddForm((f) => ({ ...f, rating: s }))}
                      className={`p-1 ${s <= addForm.rating ? "text-yellow-400" : "text-gray-300"}`}
                    >
                      <Star size={22} fill={s <= addForm.rating ? "currentColor" : "none"} />
                    </button>
                  ))}
                  <span className="ml-1 text-sm text-gray-500 self-center">{addForm.rating}/5</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review Title <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={addForm.title}
                  onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Amazing product!"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#045830] transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review Body *</label>
                <textarea
                  value={addForm.reviewBody}
                  onChange={(e) => setAddForm((f) => ({ ...f, reviewBody: e.target.value }))}
                  rows={3}
                  placeholder="Write the review..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none resize-none focus:border-[#045830] transition"
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForm.isVerified}
                  onChange={(e) => setAddForm((f) => ({ ...f, isVerified: e.target.checked }))}
                  className="w-4 h-4 accent-[#045830]"
                />
                Mark as verified purchase
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 px-4 py-2 bg-[#045830] text-white rounded-lg text-sm font-medium hover:bg-[#034524] transition disabled:opacity-50"
                >
                  {addLoading ? "Adding..." : "Add Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
