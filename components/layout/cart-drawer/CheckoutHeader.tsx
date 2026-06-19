"use client";

import { useCartStore } from "@/lib/cart/cartStore";

interface CheckoutHeaderProps {
  onBack: () => void;
  title?: string;
}

export function CheckoutHeader({ onBack, title }: CheckoutHeaderProps) {
  const closeDrawer = useCartStore((s) => s.closeDrawer);

  return (
    <div className="flex flex-col shrink-0">
      <div className="h-[45px] md:h-[60px] items-center justify-between px-[15px] md:px-[30px] flex">
        <button
          onClick={onBack}
          className="flex items-center gap-2 font-outfit txt-p-lg font-semibold text-[#121212] hover:opacity-70 transition-opacity"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="star-rating-img"
          >
            <path
              d="M19 12H5M5 12L12 19M5 12L12 5"
              stroke="#121212"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          GO BACK
        </button>
        <button
          aria-label="Close cart"
          className="p-1 hover:opacity-70 transition-opacity"
          onClick={closeDrawer}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#121212"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="star-rating-img"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div className="h-[4px] w-full bg-[#0F934E]" />
    </div>
  );
}
