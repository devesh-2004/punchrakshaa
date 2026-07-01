"use client";

import SafeImage from "@/components/common/SafeImage";
import Link from "next/link";
import { useMemo, useState, useRef, useEffect } from "react";
import { useCartStore } from "@/lib/cart/cartStore";
import { useAddToCart } from "@/lib/cart/useAddToCart";
import { formatPrice } from "@/lib/utils/formatPrice";
import { StarRating } from "@/components/ui/StarRating";
import { ButtonBase } from "@/components/ui/ButtonBase";
import GlareHover from "./GlareHover";

export interface PackOption {
  label: string;
  price: number;
  mrp: number;
  discountPercent: number;
}

export interface ProductCardData {
  _id: string;
  name: string;
  slug: string;
  category: string;
  image: string;
  imageAlt?: string;
  price: number;
  mrp: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  packLabel?: string;
  secondaryName?: string;
  label?: string;
  subLabel?: string;
  upiDiscountPercent: number;
  upiMaxDiscount: number;
  cardDiscountPercent: number;
  cardMaxDiscount: number;
  allPackOptions?: PackOption[];
  featuredLabel?: string;
  featuredSubLabel?: string;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const [qty, setQty] = useState(1);
  const [selectedPackIdx, setSelectedPackIdx] = useState(0);
  const [packDropdownOpen, setPackDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const packTriggerRef = useRef<HTMLButtonElement>(null);
  const packDropdownRef = useRef<HTMLDivElement>(null);
  const addItem = useAddToCart();

  // Close dropdown on outside click
  useEffect(() => {
    if (!packDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!packTriggerRef.current?.contains(t) && !packDropdownRef.current?.contains(t)) {
        setPackDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [packDropdownOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    if (!packDropdownOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setPackDropdownOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [packDropdownOpen]);

  const openDropdown = () => {
    if (packs.length <= 1) return;
    if (packTriggerRef.current) {
      const rect = packTriggerRef.current.getBoundingClientRect();
      const estHeight = packs.length * 40;
      const top = rect.bottom + 4 + estHeight > window.innerHeight
        ? rect.top - estHeight - 4
        : rect.bottom + 4;
      setDropdownPos({ top: Math.max(4, top), left: rect.left, width: rect.width });
    }
    setPackDropdownOpen((prev) => !prev);
  };

  // Build a normalised pack list — fall back to single entry from top-level fields
  const packs: PackOption[] = useMemo(() => {
    if (product.allPackOptions && product.allPackOptions.length > 0) {
      return product.allPackOptions;
    }
    return [
      {
        label: product.packLabel ?? "PACK OF 1",
        price: product.price,
        mrp: product.mrp,
        discountPercent: product.discountPercent,
      },
    ];
  }, [product]);

  const selectedPack = packs[selectedPackIdx] ?? packs[0];
  const off = `${selectedPack.discountPercent}% OFF`;

  const handleBuyNow = () => {
    addItem(
      {
        productId: product._id,
        name: product.name,
        secondaryName: product.secondaryName,
        label: product.label,
        subLabel: product.subLabel,
        packLabel: selectedPack.label,
        price: selectedPack.price,
        mrp: selectedPack.mrp,
        upiDiscountPercent: product.upiDiscountPercent,
        upiMaxDiscount: product.upiMaxDiscount,
        cardDiscountPercent: product.cardDiscountPercent,
        cardMaxDiscount: product.cardMaxDiscount,
        image: product.image,
      },
      qty,
    );
  };

  return (
    <div className="w-full max-w-full md:max-w-[436px] bg-white shadow-md md:hover:shadow-lg transition p-[11.37px] md:pt-[18px] md:pb-6 sm:px-[11.25px] md:px-[18px] border border-gray-200 md:border-none rounded-[10px] md:rounded-none overflow-hidden flex flex-col h-full">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative mb-4">
          <SafeImage src={product.image} alt={product.imageAlt || product.name} width={400} height={400} className="w-full h-auto object-cover" />
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
          <div className="block w-full mt-3" style={{ borderBottom: "1px solid #121212" }} />
        </div>

        {/* Price — updates with selected pack */}
        <div className="flex justify-center items-center gap-3 mb-[14px] mt-[17px] md:my-[20px]">
          <span className="txt-div-35 font-semibold font-outfit">
            {formatPrice(selectedPack.price)}
          </span>
          <span className="txt-div-22 font-semibold text-[#767676] line-through tracking-wide font-outfit">
            {formatPrice(selectedPack.mrp)}
          </span>
          <span className="txt-p font-semibold bg-[#045830] text-white px-3 py-1 btn-radius-10 font-outfit">
            {off}
          </span>
        </div>

        {/* Pack selector — custom dropdown, always shows correct label */}
        <div className="relative mx-auto w-fit md:w-[150px] mb-[20px] md:mb-[30px]">
          <button
            ref={packTriggerRef}
            type="button"
            onClick={openDropdown}
            className="w-full md:h-[45px] border border-black rounded-[6px] md:rounded-[5px] pl-[12px] pr-[36px] py-[8px] md:pl-4 md:pr-10 txt-p font-semibold cursor-pointer bg-[#F5FBF9] focus:outline-none focus:border-black font-outfit flex items-center text-left whitespace-nowrap"
          >
            {selectedPack.label}
          </button>

          {/* Fixed dropdown — escapes overflow:auto clipping on mobile scroll container */}
          {packDropdownOpen && packs.length > 1 && (
            <div
              ref={packDropdownRef}
              style={{
                position: "fixed",
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: dropdownPos.width,
                zIndex: 9999,
              }}
              className="bg-white border border-black rounded-[6px] shadow-lg overflow-hidden"
            >
              {packs.map((p, i) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setSelectedPackIdx(i);
                    setQty(1);
                    setPackDropdownOpen(false);
                  }}
                  className={`w-full text-left px-[12px] py-[8px] txt-p font-semibold font-outfit hover:bg-[#F5FBF9] transition-colors ${
                    i === selectedPackIdx ? "bg-[#F5FBF9]" : ""
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-[12px] text-black">
            <SafeImage
              src="/images/homepage/mobile-menu-arrow-down.svg"
              alt="down arrow"
              width={12}
              height={12}
              className={`transition-transform duration-200 ${packDropdownOpen ? "rotate-180" : ""}`}
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-auto w-full sm:max-h-[68px]">
          {/* Quantity stepper */}
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

          {/* BUY NOW */}
          <ButtonBase onClick={handleBuyNow}>
            BUY NOW
          </ButtonBase>
        </div>
      </div>
    </div>
  );
}
