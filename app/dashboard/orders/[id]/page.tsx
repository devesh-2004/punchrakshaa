"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import SafeImage from "@/components/common/SafeImage";
import toast from "react-hot-toast";
import { useAuthStore } from "@/lib/auth/authStore";

type Order = {
  _id: string;
  createdAt: string;
  paymentMethod: "COD" | "Prepaid";
  items: { name: string; packLabel: string; price: number; qty: number; image: string }[];
  shippingAddress: {
    fullName: string; addressLine1: string; addressLine2?: string;
    city: string; state: string; pincode: string;
  };
  status: string;
  trackingUrl?: string;
  subtotal: number;
  discount: number;
  total: number;
};

const WHATSAPP = "https://wa.me/917405498441";

const CANCEL_REASONS = [
  "Incorrect delivery address",
  "Doctor prescribed other products",
  "Delivery is delayed",
  "Want to edit the order",
  "Ordered by mistake",
  "Don't want doctor consultation",
  "Other",
];

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

function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const userName = useAuthStore((s) => s.userName);
  const firstName = (userName || "User").split(" ")[0];
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [supportWhatsapp, setSupportWhatsapp] = useState("");

  // Cancel modal
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelOther, setCancelOther] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/orders/${id}`);
        const data = await res.json();
        if (res.ok) {
          setOrder(data.order);
          setSupportWhatsapp(data.supportWhatsapp || "");
        }
        else toast.error(data?.error ?? "Order not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const canCancel = (status: string) => ["pending", "paid", "processing"].includes(status);

  const handleCancel = async () => {
    const reason = cancelReason === "Other" ? cancelOther.trim() : cancelReason;
    if (!reason) { toast.error("Please provide a reason"); return; }

    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Cancellation failed");
      setOrder(data.order);
      toast.success("Order cancelled");
      setShowCancel(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#E6F7F4] w-full p-[30px] md:p-[50px] font-outfit shadow-sm min-h-[400px]">
        <div className="space-y-4 max-w-[900px]">
          {[1, 2, 3].map((i) => <div key={i} className="h-[80px] animate-pulse rounded bg-black/10" />)}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-[#E6F7F4] w-full p-[30px] md:p-[50px] font-outfit shadow-sm min-h-[400px]">
        <p className="text-[#767676]">Order not found.</p>
        <Link href="/dashboard/orders" className="mt-4 inline-flex items-center gap-2 text-[#045830] font-semibold hover:underline">
          ← Back to orders
        </Link>
      </div>
    );
  }

  const itemTotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const itemDiscount = order.discount ?? 0;

  return (
    <div className="bg-[#E6F7F4] w-full px-[20px] py-[30px] lg:p-[60px] font-outfit shadow-sm min-h-[400px]">

      {/* Greeting + Go Back — side by side on desktop, stacked on mobile */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-[15px] mb-[30px] lg:mb-[45px] max-w-[1100px]">
        <h1 className="text-[20px] lg:text-[35px] font-semibold text-[#121212] tracking-[0.03em] lg:tracking-[0.034em] leading-tight lg:leading-[22px]">
          {getGreeting()}! {firstName}!
        </h1>
        <Link
          href="/dashboard/orders"
          className="self-end lg:self-auto inline-flex items-center gap-2 text-[16px] lg:text-[22px] font-medium text-[#121212] hover:text-[#045830] transition-colors underline underline-offset-4 leading-[25px] tracking-[0.05em]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
          </svg>
          Go Back to All Order Page
        </Link>
      </div>

      <div className="max-w-[1100px] border border-black/15 bg-white p-[20px] md:p-[30px]">

        {/* Order header — stacked on mobile, row on desktop */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-[15px]  pb-[20px] md:pb-[18px] border-b border-[#045830]">
                <span className="text-[#121212] font-semibold txt-div-20 leading-[22px] tracking-[0.03em]">{fmtDate(order.createdAt)}</span>
                <span className="text-[#767676] txt-div-20 leading-[22px] tracking-[0.03em]">Order : <span className="font-semibold text-[#121212]">{shortId(order._id)}</span></span>
                <span className="text-[#767676] txt-div-20 leading-[22px] tracking-[0.03em]">Payment : <span className="font-semibold text-[#121212]">{order.paymentMethod === "COD" ? "Cash on delivery" : "Prepaid"}</span></span>
                <span className="text-[#767676] txt-div-20 leading-[22px] tracking-[0.03em]">Total Items : <span className="font-semibold text-[#121212]">{order.items?.length ?? 0}</span></span>
              </div>

        {/* Arriving date + buttons — stacked on mobile, row on desktop */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center py-[20px] gap-[15px] md:gap-[20px]">

                {/* Arriving date */}
                <div className="txt-div-20 leading-[30px] text-[#121212] max-md:inline-flex max-md:gap-[2px] ">
                  <div >Arriving Date :</div>
                  <div className="font-bold ">{estimatedDelivery(order.createdAt)}</div>
                </div>

                {/* Action buttons — 2×2 grid on mobile, single row on desktop */}
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 lg:flex gap-[10px] md:gap-[20px]">
                    {order.trackingUrl ? (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center px-[10px] py-[8px] lg:px-[14px] lg:py-[10px] btn-radius-10 bg-[#E05C4B] text-white font-bold txt-div-22 uppercase hover:opacity-90 transition-opacity"
                      >
                        TRACK ORDER
                      </a>
                    ) : null}

                    <button
                      onClick={() => {
                        if (!supportWhatsapp) {
                          toast.error("Customer support is currently unavailable.");
                          return;
                        }
                        const orderId = shortId(order._id);
                        const orderDate = fmtDate(order.createdAt);
                        const productsText = order.items
                          .map((item) => `• ${item.name} × ${item.qty}`)
                          .join("\n");
                        const paymentMethodText = order.paymentMethod === "COD" ? "Cash on Delivery" : "Prepaid";
                        const message = `Hello PunchRaksha Team,

I need help regarding my order.

Order ID: ${orderId}

Order Date: ${orderDate}

Product(s):
${productsText}

Total Amount: ₹${order.total}

Payment Method: ${paymentMethodText}

Please assist me regarding this order.

Thank you.`;

                        const encodedMessage = encodeURIComponent(message);
                        const whatsappUrl = `https://wa.me/${supportWhatsapp}?text=${encodedMessage}`;
                        window.open(whatsappUrl, "_blank");
                      }}
                      className="flex items-center justify-center px-[10px] py-[8px] lg:px-[14px] lg:py-[10px]  btn-radius-10 bg-[#E8A224] text-black font-bold txt-div-22 uppercase hover:opacity-90 transition-opacity"
                    >
                      CONTACT US
                    </button>

                    {canCancel(order.status) ? (
                      <button
                        onClick={() => {
                          setShowCancel(true);
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
                  {!order.trackingUrl && (
                    <p className="text-xs text-[#767676] italic mt-1 font-outfit max-w-sm">
                      Tracking details are not available yet. Your shipment is being prepared. Please check again later.
                    </p>
                  )}
                </div>
        </div>


        {/* Product + pricing split */}
        <div className="flex flex-col md:flex-row gap-[20px]">

          {/* Left — items + address in a bordered box */}
          <div className="flex-1 min-w-0 border border-black/10 p-[16px]">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex gap-[16px] mb-[20px]">
                <div className="relative w-[110px] h-[110px] md:w-[100px] md:h-[100px] shrink-0 bg-[#f6f6f6] border border-black/5">
                  <SafeImage src={item.image} alt={item.name} fill className="object-contain p-2" />
                </div>
                <div className="flex flex-col justify-start min-w-0">
                  <p className="font-outfit txt-p-lg md:leading-[26px] leading-[20px] tracking-[0.03em]  font-semibold text-[#121212] ">
                    {item.name}
                  </p>
                  <p className="txt-p-lg leading-none tracking-[0.03em] text-[#767676] mt-[4px]">
                    Pack of &apos;{item.packLabel}&apos; | Qty : {item.qty}
                  </p>
                </div>
              </div>
            ))}

            {order.shippingAddress && (
              <div className="mt-[10px] pt-[14px] border-t border-black/10">
                <p className="font-outfit txt-p-lg leading-[30px] tracking-[0.03] font-semibold text-[#121212]">
                  Delivery to {order.shippingAddress.city} {order.shippingAddress.pincode}
                </p>
                <p className="txt-p-lg leading-[20px] md:leading-[30px] tracking-[0.03] text-[#767676] mt-[4px] ">
                  {order.shippingAddress.addressLine1}
                  {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""},
                  {" "}{order.shippingAddress.city}, {order.shippingAddress.state}
                </p>
              </div>
            )}
          </div>

          {/* Right — price breakdown in a bordered box */}
          <div className="md:min-w-[320px] shrink-0">
            <div className="border border-black/10 overflow-hidden">
              <div className="p-[16px]">
                <PriceLine label="Item total" value={fmt(itemTotal)} />
                {itemDiscount > 0 && (
                  <PriceLine label="Item Discount" value={`-${fmt(itemDiscount)}`} valueClass="text-[#E05C4B] font-bold" />
                )}
                <PriceLine label="Subtotal" value={fmt(order.subtotal ?? (itemTotal - itemDiscount))} />
                <div className="md:my-[15px] my-[10px] border-t border-dashed border-black/15" />
                <PriceLine  label="Shipping" value="FREE" valueClass="text-[#045830]  font-bold" />
                <div className="md:my-[15px] my-[10px] border-t border-black/15" />
                <PriceLine
                  label={`Order total${order.paymentMethod === "COD" ? "\n(Cash on delivery)" : ""}`}
                  value={fmt(order.total)}
                  labelClass="font-bold text-[#121212]"
                  valueClass="font-bold text-[#121212] mb-[10px]"
                />

       
              </div>

              {itemDiscount > 0 && (
                <div className="border-t border-[#045830]/20 bg-[#E6F7F4] py-[18px] px-[15px] md:px-[20px] md:py-[15px] flex items-center gap-[10px]">
                  <Image src="/Tickk.png" alt="saved" width={20} height={20} className="shrink-0" />
                  <span className="txt-p-lg leading-none text-[#045830] font-semibold">Saved {fmt(itemDiscount)} on your order</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {showCancel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !cancelling && setShowCancel(false)}
          />
          <div className="relative z-10 w-full max-w-[440px] bg-white p-[30px] shadow-2xl">
            <button
              onClick={() => !cancelling && setShowCancel(false)}
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
                <label key={r} className="flex items-center gap-3 lg:gap-4 cursor-pointer min-h-[40px] lg:min-h-[48px]" onClick={() => setCancelReason(r)}>
                  <div className="shrink-0 flex h-[18px] w-[18px] lg:h-[22px] lg:w-[22px] items-center justify-center rounded-full border-2 border-[#045830]">
                    {cancelReason === r && <div className="h-[9px] w-[9px] lg:h-[11px] lg:w-[11px] rounded-full bg-[#045830]" />}
                  </div>
                  <span className="text-[14px] lg:text-[20px] text-[#121212]">{r}</span>
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

function PriceLine({
  label, value, labelClass = "", valueClass = "",
}: { label: string; value: string; labelClass?: string; valueClass?: string }) {
  return (
    <div className="flex items-start justify-between gap-2 mb-[10px] md:mb-[15px] last:mb-0">
      <span className={`txt-p-lg leading-none text-[#767676] whitespace-pre-line ${labelClass}`}>{label}</span>
      <span className={`txt-p-lg leading-none text-[#121212] shrink-0 ${valueClass}`}>{value}</span>
    </div>
  );
}
