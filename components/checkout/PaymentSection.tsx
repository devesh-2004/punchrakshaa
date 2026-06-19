"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCartStore } from "@/lib/cart/cartStore";
import { loadScript } from "@/lib/utils/loadScript";
import { calculatePaymentDiscount } from "@/lib/utils/discountCalc";
import type { AddressValue } from "@/components/checkout/AddressForm";

type Method = "upi" | "card" | "cod";

export function PaymentSection({ address }: { address: AddressValue }) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  const [method, setMethod] = useState<Method>("upi");
  const [loading, setLoading] = useState(false);

  const payload = useMemo(
    () => ({
      shippingAddress: address,
      items: items.map((x) => ({ productId: x.productId, packLabel: x.packLabel, qty: x.quantity })),
    }),
    [address, items],
  );

  async function payNow() {
    setLoading(true);
    try {
      let subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
      const totalMrp = items.reduce((sum, it) => sum + it.mrp * it.quantity, 0);
      const savings = totalMrp - subtotal;
      
      const paymentDiscount = calculatePaymentDiscount(items, method);

      const orderId = "ORD" + Math.random().toString(36).substr(2, 9).toUpperCase();
      const orderData = {
        orderId,
        items: [...items],
        subtotal,
        totalMrp,
        savings,
        paymentDiscount,
        shippingAddress: {
          name: address.fullName,
          phone: address.phone,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
        },
        paymentMethod: method === "cod" ? "Cash on delivery" : "Prepaid",
        date: new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      };

      localStorage.setItem("lastOrder", JSON.stringify(orderData));
      clearCart();
      router.push("/order-success");
    } catch (e) {
      toast.error((e instanceof Error ? e.message : "Failed to place order"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[13px] border border-black/15 bg-white p-6">
      <p className="font-outfit text-[25px] font-semibold text-text-main">Payment</p>
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <PayOption label="UPI" active={method === "upi"} onClick={() => setMethod("upi")} />
        <PayOption label="Card" active={method === "card"} onClick={() => setMethod("card")} />
        <PayOption label="COD" active={method === "cod"} onClick={() => setMethod("cod")} />
      </div>

      <button
        className="mt-6 h-[68px] w-full rounded-[15px] bg-primary font-outfit text-[22px] font-semibold uppercase tracking-[2.2px] text-white disabled:opacity-50"
        disabled={loading || items.length === 0 || method === "cod"}
        onClick={payNow}
      >
        {loading ? "Processing..." : "Pay Now"}
      </button>

      {method === "cod" ? (
        <p className="mt-3 text-[14px] text-text-muted">COD flow will be wired to place an unpaid order next.</p>
      ) : null}
    </div>
  );
}

function PayOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-[56px] rounded-[10px] border px-4 text-left font-outfit text-[18px] font-semibold ${
        active ? "border-primary bg-primary/10 text-primary" : "border-black/20 bg-white text-text-main"
      }`}
    >
      {label}
    </button>
  );
}

