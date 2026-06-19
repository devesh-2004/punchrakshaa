"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils/formatPrice";

interface OrderData {
  orderId: string;
  items: any[];
  subtotal: number;
  totalMrp: number;
  savings: number;
  shippingAddress: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  paymentMethod: string;
  paymentDiscount?: number;
  date: string;
}

export default function OrderSuccessPage() {
  const [order, setOrder] = useState<OrderData | null>(null);

  useEffect(() => {
    const data = localStorage.getItem("lastOrder");
    if (data) {
      try {
        setOrder(JSON.parse(data));
      } catch (e) {
        console.error("Failed to parse order data", e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="txt-p-lg text-text-muted">Loading order details...</div>
        <Link href="/" className="mt-4 text-primary underline">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-12 font-outfit pt-10">
      <div className="max-w-[700px] mx-auto px-4 flex flex-col  gap-[20px] md:gap-[30px]">
        {/* Success Banner */}
        <div className="bg-[#EBF7F2] py-[20px] px-[15px] md:p-[30px]">
          <div className="flex items-start gap-[10px] md:gap-4">
            <Image
              src="/images/checkout/discount.svg"
              alt="Success icon"
              width={30}
              height={30}
              className="shrink-0 h-[20px] w-[20px] md:h-[30px] md:w-[30px] mt-[2px] md:mt-[10px]"
            />
            <div className="flex flex-col">
              <div className=" text-[18px] md:txt-h1 font-semibold text-[#045830] mb-3">
                Your order placed successfully!
              </div>
              <div className="txt-p-lg text-[#121212] mb-1">
                Order ID : {order.orderId}
              </div>
              <div className="txt-p-lg text-[#121212]">
                Order Status : Confirmed
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Details */}
        <section>
          <div className="txt-h2 font-semibold text-[#121212] mb-[15px] md:mb-[20px]">
            Shipping Details
          </div>
          <div className="border border-[#E5E7EB] p-[15px] md:p-[20px] space-y-[20px] md:space-y-[30px]">
            <div>
              <div className="txt-p-lg font-light text-[#121212] mb-[20px] md:mb-[30px]">
                Expected Delivery by,
              </div>
              <div className="txt-p-lg font-semibold text-[#121212] mb-[10px]">
                {new Date(
                  Date.now() + 5 * 24 * 60 * 60 * 1000,
                ).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="txt-p-lg text-[#121212]">
                Your order is packed and will be shipped by{" "}
                <span className="font-semibold">5:30 PM</span> tomorrow
              </div>
            </div>
            <div className="h-[1px] bg-[#000000]/50 w-full" />
            <div>
              <div className="txt-p-lg font-light text-[#121212] mb-2">
                Delivery Address
              </div>
              <div className="txt-p-lg font-semibold text-[#121212] break-words">
                {order.shippingAddress.name},{" "}
                {order.shippingAddress.addressLine1}
                {order.shippingAddress.addressLine2
                  ? `, ${order.shippingAddress.addressLine2}`
                  : ""}
                ,
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state}, IN.{" "}
                {order.shippingAddress.pincode},
                <br />
                {order.shippingAddress.phone}
              </div>
            </div>
          </div>
        </section>

        {/* Order Summary (Items) */}
        <section>
          <div className="txt-h2 font-semibold text-[#121212]  mb-[15px] md:mb-[20px]">
            Order Summary
          </div>
          <div className="space-y-4">
            {order.items.map((item, idx) => (
              <div
                key={idx}
                className="border border-[#E5E7EB] p-[15px] md:p-[20px] flex gap-4 md:gap-6 items-center"
              >
                <div className="relative h-[80px] w-[80px] md:h-[100px] md:w-[100px] shrink-0 bg-[#F9F9F9] border border-[#E5E7EB]">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col md:flex-row md:justify-between md:items-start gap-[10px] md:gap-4">
                  <div className="flex flex-col">
                    <div className="txt-p-lg text-[#121212]">
                      <span className="font-semibold">{item.name}</span>
                      {item.secondaryName && (
                        <span className="font-normal ml-1">
                          {item.secondaryName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[#121212] txt-p-lg font-light mt-[10px] md:mt-[15px]">
                      <span>
                        Pack of &apos;{item.packLabel?.replace(/pack of /i, "") || item.quantity}
                        &apos;
                      </span>
                      <span className="text-[#D9D9D9]">|</span>
                      <span>Qty : {item.quantity}</span>
                    </div>
                  </div>
                  <div className="txt-h3-lg font-bold text-[#121212] shrink-0">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Price Details */}
        <section>
          <div className="txt-h2 font-semibold text-[#121212] mb-[15px] md:mb-[20px]">
            Order Summary
          </div>
          <div className="border border-[#E5E7EB] flex flex-col">
            <div className="p-[15px] md:p-6 space-y-[10px] md:space-y-4 bg-white">
              <div className="flex justify-between txt-p-lg text-[#121212] font-light">
                <span>Item total</span>
                <span>{formatPrice(order.totalMrp)}</span>
              </div>
              <div className="flex justify-between txt-p-lg text-[#121212] font-light">
                <span>Item Discount</span>
                <span className="text-[#045830] font-semibold">
                  -{formatPrice(order.savings)}
                </span>
              </div>
              <div className="flex justify-between txt-p-lg text-[#121212] font-light">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>

              <div className="border-t border-dashed border-[#D9D9D9] my-2" />

              {(order.paymentDiscount ?? 0) > 0 && (
                <>
                  <div className="flex justify-between font-outfit txt-p-lg font-semibold text-[#0F934E] mb-2">
                    <span>Extra Payment Discount</span>
                    <span>- {formatPrice(order.paymentDiscount ?? 0)}</span>
                  </div>
                  <div className="border-t border-dashed border-[#D9D9D9] my-2" />
                </>
              )}

              <div className="flex justify-between txt-p-lg text-[#121212] font-light">
                <span>Shipping</span>
                <span>FREE</span>
              </div>

              <div className="border-t border-dashed border-[#D9D9D9] my-2" />

              <div className="flex justify-between txt-p-lg text-[#121212] font-semibold">
                <span>Order total ({order.paymentMethod})</span>
                <span>{formatPrice(order.subtotal - (order.paymentDiscount || 0))}</span>
              </div>
            </div>

            {/* Savings Banner */}
            <div className="bg-[#EBF7F2] px-5 py-4 flex items-center gap-3">
              <Image
                src="/images/checkout/discount.svg"
                alt="Savings icon"
                width={20}
                height={20}
                className="shrink-0"
              />
              <div className="txt-p-lg text-[#045830] font-semibold">
                Saved {formatPrice(order.savings + (order.paymentDiscount || 0))} on your order
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
