"use client";

import { memo } from "react";

const baseItems = [
  "FREE Shipping on all Prepaid Orders",
  "Free COD on orders above ₹299",
  "EXTRA 5% OFF ON ALL PREPAID ORDERS",
  "FREE SHILAJIT WORTH ₹599 ON ORDERS ABOVE ₹1399",
];

const items = [...baseItems, ...baseItems];

export const AnnouncementBar = memo(function AnnouncementBar() {
  const content = (
    <div className="flex items-center gap-[30px] whitespace-nowrap pl-[30px]">
      {items.map((t, idx) => (
        <div key={`${t}-${idx}`} className="flex items-center gap-[30px]">
          <span className="inline-block text-sm font-normal tracking-wide md:text-base font-rem uppercase">{t}</span>
          <div className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-[35px] md:h-[50px] w-full items-center overflow-hidden bg-[#045830] text-white">
      <div className="flex w-max animate-marquee will-change-transform hover:[animation-play-state:paused]">
        {content}
        {content}
      </div>
    </div>
  );
});

