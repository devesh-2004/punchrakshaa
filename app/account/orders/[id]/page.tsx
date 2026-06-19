"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const reasons = [
  "Ordered by mistake",
  "Found a better alternative",
  "Delivery time too long",
  "Other",
];

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState(reasons[0]!);
  const [other, setOther] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load order");
      setOrder(data.order);
    } catch (e) {
      toast.error((e instanceof Error ? e.message : "Failed to load order"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cancel() {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason: reason === "Other" ? other : reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Cancellation failed");
      toast.success("Order cancelled");
      setOrder(data.order);
    } catch (e) {
      toast.error((e instanceof Error ? e.message : "Cancellation failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full bg-white">
      <div className="mx-auto max-w-[1920px] px-4 lg:px-[50px] py-[60px]">
        <h1 className="font-outfit text-[45px] font-semibold tracking-[1.35px] text-text-main">Order Detail</h1>

        <div className="mt-10 rounded-[13px] border border-black/15 bg-white p-6">
          {loading ? (
            <p className="text-[20px] text-text-muted">Loading...</p>
          ) : !order ? (
            <p className="text-[20px] text-text-muted">Order not found.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="font-outfit text-[20px] font-semibold text-text-main">{order._id}</p>
                <span className="rounded-[10px] bg-primary/10 px-3 py-1 text-[14px] font-semibold text-primary">
                  {order.status}
                </span>
              </div>
              <div className="mt-4 h-px w-full bg-black/10" />
              <div className="mt-4 text-[16px] text-text-muted">
                <p>Items: {order.items?.length ?? 0}</p>
                <p>Total: ₹{order.total}</p>
              </div>

              {["pending", "paid", "processing"].includes(order.status) ? (
                <div className="mt-8 rounded-[10px] border border-black/10 p-4">
                  <p className="font-outfit text-[18px] font-semibold text-text-main">Cancel Order</p>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-[14px] text-text-muted">Reason</span>
                      <select
                        className="h-[52px] w-full rounded-[10px] border border-black/20 px-4 outline-none"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      >
                        {reasons.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </label>
                    {reason === "Other" ? (
                      <label className="block">
                        <span className="mb-2 block text-[14px] text-text-muted">Other</span>
                        <input
                          className="h-[52px] w-full rounded-[10px] border border-black/20 px-4 outline-none"
                          value={other}
                          onChange={(e) => setOther(e.target.value)}
                          placeholder="Type reason"
                        />
                      </label>
                    ) : null}
                  </div>
                  <button
                    className="mt-5 h-[56px] rounded-[15px] bg-primary px-6 font-outfit text-[18px] font-semibold uppercase tracking-[2.2px] text-white disabled:opacity-50"
                    disabled={saving || (reason === "Other" && other.trim().length < 2)}
                    onClick={cancel}
                  >
                    {saving ? "Cancelling..." : "Cancel Order"}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

