"use client";

import { useState } from "react";
import SafeImage from "@/components/common/SafeImage";

export function Accordion({
  items,
  defaultOpenIndex,
}: {
  items: { question: string; answer: string }[];
  defaultOpenIndex?: number;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(defaultOpenIndex ?? null);

  return (
    <div className="flex flex-col gap-[10px] md:gap-[14px]">
      {items.map((it, idx) => {
        const open = openIdx === idx;
        return (
          <div
            key={it.question}
            className={`overflow-hidden transition-colors duration-300 ${open ? "bg-[#045830]" : "bg-[#EDF9F5]"
              }`}
          >
            {/* Question Row */}
            <button
              className={`flex w-full items-center justify-between gap-[45px] px-[20px] py-[20px] md:px-[30px] ${open ? "md:pb-[30px] md:pt-[45px]" : "md:py-[30px]"} text-left`}
              onClick={() => setOpenIdx((cur) => (cur === idx ? null : idx))}
              aria-expanded={open}
            >
              <h3
                className={`txt-h3-lg-alt font-medium  ${open ? "text-white" : "text-[#121212]"
                  }`}
              >
                {idx + 1}. {it.question}
              </h3>
              {/* Chevron — rotates when open */}
              <SafeImage src={open ? "/images/product/accordian-up.svg" : "/images/product/accordian-arrow.svg"} alt="accordian-arrow" width={20} height={23} className="star-rating-img" />
            </button>

            {/* Divider (only when open) */}
            {open && <div className="mx-[20px] md:mx-[30px] border-t border-white/40" />}

            {/* Answer */}
            {open && (
              <div className="px-[20px] py-[20px] md:px-[30px] md:py-[30px] flex flex-col gap-[20px]">
                {it.answer.split('\n').map((line, i) => (
                  line.trim() !== '' ? (
                    <p key={i} className="txt-p-lg text-white/90">
                      {line}
                    </p>
                  ) : null
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
