"use client";

import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils/formatPrice";
import { useCartStore } from "@/lib/cart/cartStore";
import { ButtonBase } from "@/components/ui/ButtonBase";

interface CheckoutFooterProps {
  subtotal: number;
  savings: number;
  totalMrp: number;
  paymentDiscount?: number;
  onAction: () => void;
  actionText?: string;
  isProcessing?: boolean;
  secondaryAction?: () => void;
  secondaryActionText?: JSX.Element | string;
  isAddAddressStep?: boolean;
  savingsInsideDetails?: boolean;
}

export function CheckoutFooter({
  subtotal,
  savings,
  totalMrp,
  paymentDiscount = 0,
  onAction,
  actionText = "PAYMENT",
  isProcessing = false,
  secondaryAction,
  secondaryActionText,
  isAddAddressStep = false,
  savingsInsideDetails = false,
}: CheckoutFooterProps) {
  const [showPriceDetails, setShowPriceDetails] = useState(false);

  return (
    <div className="shrink-0 border-black/10 bg-white overflow-hidden">
      {/* Price Summary Section (Green Bar + expandable details in normal flow) */}
      <div className="flex flex-col">
        <div className="bg-[#0F934E] px-[15px] md:px-[30px] py-[8px] md:py-[10px] flex items-center justify-between">
          <button
            onClick={() => setShowPriceDetails(!showPriceDetails)}
            className="w-full flex items-center justify-between group"
          >
            <div className="flex items-center justify-between gap-[15px]">
              <div className="font-outfit txt-p-lg font-semibold text-white">
                Price summary
                <span className="font-outfit txt-p text-white/70 line-through font-medium pl-[15px] md:pl-[20px]">
                  {formatPrice(totalMrp)}
                </span>
                <span className="font-outfit txt-p-lg font-bold text-white pl-[10px]">
                  {formatPrice(subtotal - paymentDiscount)}
                </span>
              </div>
            </div>
            <div className="block">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="23"
                viewBox="0 0 20 23"
                fill="none"
                className={`transition-transform duration-300 ${showPriceDetails ? "rotate-180" : ""} h-[10px] w-[16px] md:h-[16px] md:w-[20px]`}
              >
                <path
                  d="M9.24376 17.1359L0.567734 8.40559C0.149297 7.98454 0.149297 7.30191 0.567734 6.8809L1.57965 5.86265C1.99738 5.44232 2.67439 5.44151 3.09309 5.86086L10.0014 12.7798L16.9097 5.86086C17.3284 5.44151 18.0054 5.44232 18.4231 5.86265L19.435 6.8809C19.8534 7.30195 19.8534 7.98458 19.435 8.40559L10.759 17.1359C10.3406 17.5569 9.6622 17.5569 9.24376 17.1359Z"
                  fill="#ffffffff"
                />
              </svg>
            </div>

            {/* <div className="flex items-center gap-[15px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-300 ${showPriceDetails ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div> */}
          </button>
        </div>

        {/* Expanded Price Details — in normal flow, pushes Last Minute Checkout up */}
        {showPriceDetails && (
          <div className="animate-in slide-in-from-top duration-200">
            <div className="px-4 md:px-[30px] py-[15px] bg-white">
              <div className="space-y-[5px]">
                <div className="flex justify-between font-outfit txt-p-lg font-normal text-[#121212]">
                  <span>Item MRP</span>
                  <span>{formatPrice(totalMrp)}</span>
                </div>
                <div className="flex justify-between font-outfit txt-p-lg font-normal text-[#0F934E]">
                  <span>Discount on MRP</span>
                  <span>- {formatPrice(totalMrp - subtotal)}</span>
                </div>
                {paymentDiscount > 0 && (
                  <div className="flex justify-between font-outfit txt-p-lg font-normal text-[#0F934E]">
                    <span>Extra Discount</span>
                    <span>- {formatPrice(paymentDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-outfit txt-p-lg font-semibold text-[#0F934E]">
                  <span>Total savings</span>
                  <span>(-) {formatPrice(totalMrp - subtotal + paymentDiscount)}</span>
                </div>
              </div>
              <div className="my-[12px] h-[2px] w-full bg-[#767676]" />
              <div className="flex justify-between font-outfit txt-p-lg font-bold text-[#121212]">
                <span>Grand total</span>
                <span>{formatPrice(subtotal - paymentDiscount)}</span>
              </div>
            </div>
            {savingsInsideDetails && (
              <div className="bg-black py-[10px] px-6 flex items-center justify-center gap-[5px] md:gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z" fill="#FFD700" />
                  <path d="M19 15L20.2 18.5L24 20L20.2 21.5L19 25L17.8 21.5L14 20L17.8 18.5L19 15Z" fill="#FFD700" />
                </svg>
                <div className="font-outfit txt-p text-white font-medium">
                  You saved <span className="font-bold">{formatPrice(totalMrp - subtotal + paymentDiscount)}</span> on this order
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Always-visible "You saved" bar — only on steps where it's not inside the details */}
      {!savingsInsideDetails && (
        <div className="bg-black py-[10px] md:py-3 px-6 flex items-center justify-center gap-[5px] md:gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z" fill="#FFD700" />
            <path d="M19 15L20.2 18.5L24 20L20.2 21.5L19 25L17.8 21.5L14 20L17.8 18.5L19 15Z" fill="#FFD700" />
          </svg>
          <div className="font-outfit txt-p text-white font-medium">
            You saved <span className="font-bold">{formatPrice(totalMrp - subtotal + paymentDiscount)}</span> on this order
          </div>
        </div>
      )}

      {/* Action Area */}
      <div
        className="px-4 md:px-6 py-5 flex items-center justify-between gap-[20px] md:gap-[30px]"
      >
        <div className="flex flex-col shrink-0">
          <div className="font-outfit txt-h1 font-bold text-[#121212]">
            {formatPrice(subtotal - paymentDiscount)}
          </div>
          <button
            onClick={() => setShowPriceDetails(!showPriceDetails)}
            className="font-outfit !text-[12px] md:txt-p text-[#4F4F4F] font-bold underline underline-offset-2 text-left"
          >
            View Price Details
          </button>
        </div>
        <ButtonBase
          onClick={onAction}
          disabled={isProcessing}
          // className="flex-1 h-[58px] btn-radius-10 bg-[#045830] flex items-center justify-center font-outfit txt-div-22 font-bold uppercase tracking-wide text-white shadow-md hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-70"
        >
          {isProcessing ? "Processing..." : actionText}
        </ButtonBase>
      </div>
    </div>
  );
}
