"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { useAuthStore } from "@/lib/auth/authStore";

type Order = {
  _id: string;
  createdAt: string;
  paymentMethod: "COD" | "Prepaid";
  items: { name: string; packLabel: string; price: number; qty: number; image: string }[];
  status: string;
  trackingUrl?: string;
  awbCode?: string;
  total: number;
  discount: number;
  subtotal: number;
};

const WHATSAPP = "https://wa.me/917405498441";

function shortId(id: string) {
  return "#" + id.slice(-8).toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function estimatedDelivery(iso: string) {
  const d = new Date(iso);
  d.setDate(d.getDate() + 7);
  return fmtDate(d.toISOString());
}

const CANCEL_REASONS = [
  "Incorrect delivery address",
  "Doctor prescribed other products",
  "Delivery is delayed",
  "Want to edit the order",
  "Ordered by mistake",
  "Don't want doctor consultation",
  "Other",
];

export default function DashboardOrders() {
  const userName = useAuthStore((s) => s.userName);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Cancel modal
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelOther, setCancelOther] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) setOrders(data.orders ?? []);
        else toast.error(res.status === 401 ? "Session expired. Please log in again." : "Could not load orders. Please refresh.");
      } catch {
        if (!cancelled) toast.error("Could not load orders. Please refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const canCancel = (status: string) => ["pending", "paid", "processing"].includes(status);

  const handleCancel = async () => {
    if (!cancelOrderId) return;
    const reason = cancelReason === "Other" ? cancelOther.trim() : cancelReason;
    if (!reason) { toast.error("Please provide a reason"); return; }

    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${cancelOrderId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Cancellation failed");
      setOrders((prev) => prev.map((o) => o._id === cancelOrderId ? { ...o, ...data.order } : o));
      toast.success("Order cancelled");
      setCancelOrderId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setCancelling(false);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="bg-[#E6F7F4] w-full py-[30px] px-[20px] lg:p-[60px] font-outfit shadow-sm min-h-[400px]">
      <h1 className="txt-h1  font-medium text-[#121212] tracking-[0.03em] lg:leading-[22px] mb-[30px] lg:mb-[45px]">
        {getGreeting()}! {userName ? userName.split(" ")[0] : "User"}!
      </h1>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="h-[120px] animate-pulse rounded bg-black/10" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-[#045830] rounded-[5px]">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#045830" strokeWidth="1.5" className="mb-4 opacity-40"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          <h2 className="font-outfit text-[18px] font-bold text-[#121212] mb-1">No Orders Yet</h2>
          <p className="font-outfit text-[#767676] text-[14px]">Your orders will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-[20px] max-w-[1100px]">
          {orders.map((order) => (
            <div key={order._id} className="border border-black/15 bg-white px-[15px] py-[20px] md:p-[20px]">

              {/* Header — stacked on mobile, single row on desktop */}
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-[15px]  pb-[20px] md:pb-[18px] border-b border-[#045830]">
                <span className="text-[#121212] font-semibold txt-div-20 leading-[22px] tracking-[0.03em]">{fmtDate(order.createdAt)}</span>
                <span className="text-[#767676] txt-div-20 leading-[22px] tracking-[0.03em]">Order : <span className="font-semibold text-[#121212]">{shortId(order._id)}</span></span>
                <span className="text-[#767676] txt-div-20 leading-[22px] tracking-[0.03em]">Payment : <span className="font-semibold text-[#121212]">{order.paymentMethod === "COD" ? "Cash on delivery" : "Prepaid"}</span></span>
                <span className="text-[#767676] txt-div-20 leading-[22px] tracking-[0.03em]">Total Items : <span className="font-semibold text-[#121212]">{order.items?.length ?? 0}</span></span>
              </div>

              {/* Bottom section */}
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center pt-[20px] gap-[15px] md:gap-[20px]">

                {/* Arriving date */}
                <div className="txt-div-20 leading-[30px] text-[#121212] max-md:inline-flex max-md:gap-[2px] ">
                  <div >Arriving Date :</div>
                  <div className="font-bold ">{estimatedDelivery(order.createdAt)}</div>
                </div>

                {/* Action buttons — 2×2 grid on mobile, single row on desktop */}
                <div className="grid grid-cols-2 lg:flex gap-[10px] md:gap-[20px]">
                  <a
                    href={order.trackingUrl || WHATSAPP}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center px-[10px] py-[8px] lg:px-[14px] lg:py-[10px] btn-radius-10 bg-[#E05C4B] text-white font-bold txt-div-22 uppercase hover:opacity-90 transition-opacity"
                  >
                    TRACK ORDER
                  </a>

                  <Link
                    href={`/dashboard/orders/${order._id}`}
                    className="flex items-center justify-center px-[10px] py-[8px] lg:px-[14px] lg:py-[10px]  btn-radius-10 bg-[#045830] text-white font-bold txt-div-22 uppercase hover:opacity-90 transition-opacity"
                  >
                    VIEW ORDER
                  </Link>

                  <a
                    href={WHATSAPP}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center px-[10px] py-[8px] lg:px-[14px] lg:py-[10px]  btn-radius-10 bg-[#E8A224] text-black font-bold txt-div-22 uppercase hover:opacity-90 transition-opacity"
                  >
                    CONTACT US
                  </a>

                  {canCancel(order.status) ? (
                    <button
                      onClick={() => {
                        setCancelOrderId(order._id);
                        setCancelReason(CANCEL_REASONS[0]);
                        setCancelOther("");
                      }}
                      className="flex items-center justify-center px-[10px] py-[8px] lg:px-[14px] lg:py-[10px]  btn-radius-10 bg-black text-white font-bold txt-div-22 uppercase hover:opacity-80 transition-opacity"
                    >
                      CANCEL
                    </button>
                  ) : (
                    <span className="flex items-center justify-center px-[10px] py-[8px] lg:px-[14px] lg:py-[10px] btn-radius-10 bg-black/10 text-[#767676] font-bold txt-div-22 uppercase">
                      {order.status.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Mobile bottom nav */}
      <div className="mt-[40px] flex lg:hidden items-center gap-[20px] text-[18px] font-semibold text-[#121212]">
        <Link href="/dashboard/addresses" className="flex items-center gap-2 hover:opacity-70 transition-opacity underline underline-offset-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Address Page
        </Link>
        <span className="text-[#121212]/30 text-[24px]">|</span>
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-70 transition-opacity underline underline-offset-4">
          Profile Page
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </Link>
      </div>

      {/* Cancellation Modal */}
      {cancelOrderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !cancelling && setCancelOrderId(null)}
          />
          <div className="relative z-10 w-full max-w-[440px] bg-white p-[30px] shadow-2xl">
            {/* Close */}
            <button
              onClick={() => !cancelling && setCancelOrderId(null)}
              className="absolute right-[-16px] top-[-16px] w-[34px] h-[34px] lg:w-[40px] lg:h-[40px] rounded-full bg-[#045830] flex items-center justify-center hover:opacity-80 transition-opacity shadow-[0_0_12px_4px_rgba(4,88,48,0.45)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h3 className="font-outfit text-[16px] lg:text-[25px] font-semibold text-[#121212] mb-[20px]">
              Reason for cancellation
            </h3>

            <div className="flex flex-col mb-[20px]">
              {CANCEL_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-3 lg:gap-4 cursor-pointer min-h-[40px] lg:min-h-[48px]">
                  <div
                    className="shrink-0 flex h-[18px] w-[18px] lg:h-[22px] lg:w-[22px] items-center justify-center rounded-full border-2 border-[#045830]"
                    onClick={() => setCancelReason(r)}
                  >
                    {cancelReason === r && <div className="h-[9px] w-[9px] lg:h-[11px] lg:w-[11px] rounded-full bg-[#045830]" />}
                  </div>
                  <span
                    className="text-[14px] lg:text-[20px] text-[#121212]"
                    onClick={() => setCancelReason(r)}
                  >
                    {r}
                  </span>
                </label>
              ))}
            </div>

            {cancelReason === "Other" && (
              <textarea
                rows={3}
                placeholder="Enter your comment"
                value={cancelOther}
                onChange={(e) => setCancelOther(e.target.value)}
                className="w-full border border-[#d9d9d9] p-[10px] text-[14px] text-[#121212] outline-none focus:border-[#045830] transition-colors resize-none mb-[16px]"
              />
            )}

            <button
              onClick={handleCancel}
              disabled={cancelling || (cancelReason === "Other" && !cancelOther.trim())}
              className="w-full h-[51px] lg:h-[55px] bg-black text-white font-semibold text-[16px] lg:text-[22px] uppercase rounded-[15px] hover:bg-[#045830] transition-colors disabled:opacity-50"
            >
              {cancelling ? "CANCELLING..." : "CONFIRM CANCELLATION"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
