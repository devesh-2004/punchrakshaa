"use client";

import SafeImage from "@/components/common/SafeImage";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCartStore } from "@/lib/cart/cartStore";
import { useAddToCart } from "@/lib/cart/useAddToCart";
import { formatPrice } from "@/lib/utils/formatPrice";
import { StarRating } from "@/components/ui/StarRating";
import { ButtonBase } from "@/components/ui/ButtonBase";
import GlareHover from "./GlareHover";

export interface ProductCardData {
  _id: string;
  name: string;
  slug: string;
  category: string;
  image: string;
  price: number;
  mrp: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  packLabel?: string; // "PACK OF 1"
  secondaryName?: string;
  label?: string;
  subLabel?: string;
  upiDiscountPercent: number;
  upiMaxDiscount: number;
  cardDiscountPercent: number;
  cardMaxDiscount: number;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const [qty, setQty] = useState(1);
  const addItem = useAddToCart();

  const packLabel = product.packLabel ?? "PACK OF 1";
  const off = useMemo(() => `${product.discountPercent}% OFF`, [product.discountPercent]);

  return (
    <div className="w-full max-w-full md:max-w-[436px] bg-white shadow-md md:hover:shadow-lg transition p-[11.37px] md:pt-[18px] md:pb-6 sm:px-[11.25px] md:px-[18px] border border-gray-200 md:border-none rounded-[10px] md:rounded-none overflow-hidden flex flex-col h-full">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative mb-4">
          <SafeImage src={product.image} alt={product.name} width={400} height={400} className="w-full h-auto object-cover" />
        </div>
      </Link>

      <div className="text-center flex flex-col flex-grow">
        {(product.label || product.subLabel) ? (
          <>
            <Link href={`/product/${product.slug}`}>
              <h3 className={`txt-h3-lg font-semibold md:font-semibold text-[#045830] font-outfit pb-[5px] ${product.subLabel ? "mb-1" : "mb-4"}`}>
                {product.label || product.subLabel}
              </h3>
            </Link>
            {product.label && product.subLabel && (
              <p className="text-xs text-[#767676] font-outfit mb-4 md:mx-0">
                {product.subLabel}
              </p>
            )}
          </>
        ) : (
          <>
            <Link href={`/product/${product.slug}`}>
              <h3 className="txt-h3-lg font-semibold md:font-semibold text-gray-900 mb-1 font-outfit pb-[5px]">
                {product.name}
              </h3>
            </Link>
            {product.secondaryName && (
              <p className="txt-p-lg md:txt-p-lg text-[#121212] md:text-[#121212] mb-4 md:mx-0 font-outfit">
                {product.secondaryName}
              </p>
            )}
          </>
        )}

        <div className="flex flex-col items-center mx-2 md:mx-0">
          <div className="flex items-center justify-center gap-2 mb-1 w-full flex-wrap">
            <StarRating value={product.rating} />
            <span className="pt-[2px] product-rating star-rating">
              {product.rating.toFixed(1)} rating | {product.reviewCount} review
            </span>
          </div>
          {/* Divider line below rating */}
          <div className="block w-full mt-3" style={{ borderBottom: "1px solid #121212" }} />
        </div>

        <div className="flex justify-center items-center gap-3 mb-[14px] mt-[17px] md:my-[20px]">
          <span className="txt-div-35 font-semibold font-outfit">
            {formatPrice(product.price)}
          </span>
          <span className="txt-div-22 font-semibold text-[#767676] line-through tracking-wide font-outfit">
            {formatPrice(product.mrp)}
          </span>
          <span className="txt-p font-semibold bg-[#045830] text-white px-3 py-1 btn-radius-10 font-outfit">
            {off}
          </span>
        </div>

        <div className="relative mx-auto w-fit  md:w-[150px] mb-[20px] md:mb-[30px]">
          <select className="appearance-none w-full md:h-[45px] border border-black rounded-[6px] md:rounded-[5px] pl-[12px] pr-[36px] py-[8px] md:pl-4 md:pr-10 txt-p font-semibold cursor-pointer bg-[#F5FBF9] focus:outline-none focus:ring-0 focus:border-black font-outfit">
            <option className="txt-p font-semibold">PACK OF &apos;1&apos;</option>
            <option className="txt-p font-semibold">PACK OF &apos;2&apos;</option>
            <option className="txt-p font-semibold">PACK OF &apos;3&apos;</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-[12px] text-black">
            <SafeImage src="/images/homepage/mobile-menu-arrow-down.svg" alt="down arrow" width={12} height={12} />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-auto w-full sm:max-h-[68px]">
          {/* Quantity Stepper — full width on mobile, 38% on desktop */}
          <div className="flex items-center justify-between border border-[#121212] rounded-[10px] md:rounded-[5px] px-4 py-[15px] md:py-[20px] bg-[#F2F7F3] w-full md:basis-[38%] md:shrink-0 btn-p">
            <button
              className="txt-div-22 font-outfit text-[#121212]"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              <SafeImage src="/images/homepage/minus.svg" alt="minus" width={10} height={10} />
            </button>
            <span className="px-2 txt-div-22 font-semibold text-[#767676] font-outfit">{qty}</span>
            <button
              className="txt-div-22 font-outfit text-[#121212]"
              onClick={() => setQty((q) => Math.min(99, q + 1))}
              aria-label="Increase quantity"
            >
              <SafeImage src="/images/homepage/plus.svg" alt="plus" width={10} height={10} />
            </button>
          </div>

          {/* BUY NOW — takes remaining space */}

          <ButtonBase
            onClick={() =>
              addItem(
                {
                  productId: product._id,
                  name: product.name,
                  secondaryName: product.secondaryName,
                  label: product.label,
                  subLabel: product.subLabel,
                  packLabel: packLabel.replace("OF", "of").replace("PACK", "PACK"),
                  price: product.price,
                  mrp: product.mrp,
                  upiDiscountPercent: product.upiDiscountPercent,
                  upiMaxDiscount: product.upiMaxDiscount,
                  cardDiscountPercent: product.cardDiscountPercent,
                  cardMaxDiscount: product.cardMaxDiscount,
                  image: product.image,
                },
                qty,
              )
            }
          >
            BUY NOW
          </ButtonBase>
        </div>
      </div>
    </div>
  );
}

