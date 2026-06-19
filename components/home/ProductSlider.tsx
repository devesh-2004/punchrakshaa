"use client";

import { useRef } from "react";
import { ProductCard, type ProductCardData } from "@/components/ui/ProductCard";
import Image from "next/image";

interface ProductSliderProps {
  products: ProductCardData[];
}

export function ProductSlider({ products }: ProductSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.8;

      if (direction === "right") {
        // If we are near the end, wrap back to the start
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
      } else {
        // If we are at the start, wrap to the end
        if (scrollLeft <= 10) {
          scrollRef.current.scrollTo({ left: scrollWidth, behavior: "smooth" });
        } else {
          scrollRef.current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
        }
      }
    }
  };

  return (
    <>
      <div
        ref={scrollRef}
        className="mt-4 flex flex-nowrap overflow-x-auto gap-[12px] px-4 pb-4 snap-x snap-mandatory md:grid md:grid-cols-2 xl:grid-cols-4 scrollbar-hide"
      >
        {products.map((p) => (
          <div key={p._id} className="w-[82vw] max-w-[436px] shrink-0 snap-center md:w-full md:mx-auto">
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {/* Mobile Scroll Arrows */}
      <div className="flex md:hidden items-center justify-center gap-4 mt-6">
        <button
          onClick={() => scroll("left")}
          className="flex h-[43px] w-[50px] items-center justify-center bg-[#A4D25E]/15 text-[#045830] active:scale-95 py-[14.5px] px-[21.5px] transition-transform"
          aria-label="Scroll left"
        >
          <Image src="/images/homepage/left-arrow-m.svg" alt="Left Arrow" width={14} height={7} />
        </button>
        <button
          onClick={() => scroll("right")}
          className="flex h-[43px] w-[50px] items-center justify-center bg-[#A4D25E] text-[#000] active:scale-95 py-[14.5px] px-[21.5px] transition-transform"
          aria-label="Scroll right"
        >
          <Image src="/images/homepage/right-arrow-m.svg" alt="Right Arrow" width={14} height={7} />
        </button>
      </div>
    </>
  );
}
