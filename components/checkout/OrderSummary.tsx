"use client";

import SafeImage from "@/components/common/SafeImage";
import { useCartStore } from "@/lib/cart/cartStore";
import { formatPrice } from "@/lib/utils/formatPrice";

export function OrderSummary() {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());

  return (
    <div className="rounded-[13px] border border-black/15 bg-white p-6">
      <p className="font-outfit text-[25px] font-semibold text-text-main">Order Summary</p>
      <div className="mt-5 flex flex-col gap-4">
        {items.map((it) => (
          <div key={`${it.productId}-${it.packLabel}`} className="flex gap-4 border-b border-black/10 pb-4">
            <div className="relative h-[72px] w-[72px] overflow-hidden rounded-[10px] bg-[#f2f7f3]">
              <SafeImage src={it.image} alt={it.name} fill className="object-cover" />
            </div>
            <div className="flex-1">
              <p className="font-outfit text-[18px] text-text-main">
                <span className="font-semibold">{it.name}</span>
                {it.secondaryName && (
                  <span className="font-normal ml-1">
                    {it.secondaryName}
                  </span>
                )}
              </p>
              <p className="mt-1 text-[14px] text-text-muted">
                {it.packLabel} • Qty {it.quantity}
              </p>
            </div>
            <p className="font-outfit text-[18px] font-semibold text-text-main">
              {formatPrice(it.price * it.quantity)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[16px] text-text-muted">Subtotal</p>
        <p className="font-outfit text-[20px] font-semibold text-text-main">{formatPrice(subtotal)}</p>
      </div>
    </div>
  );
}

