"use client";

import { ProductTabs } from "./ProductTabs";
import SafeImage from "@/components/common/SafeImage";
import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import { StarRating } from "@/components/ui/StarRating";
import { formatPrice } from "@/lib/utils/formatPrice";
import { useCartStore } from "@/lib/cart/cartStore";
import { useAddToCart } from "@/lib/cart/useAddToCart";
import { useProductStore } from "@/lib/store/productStore";
import {
  ChevronLeft,
  ChevronRight,
  Share2,
  Info,
  Star,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { ButtonBase } from "../ui/ButtonBase";

const defaultImages = Array.from({ length: 6 }).map(
  () => "/images/placeholders/product-placeholder.svg",
);

const defaultPackOptions = [
  {
    label: "PACK OF 3",
    badge: "Expert Recommended",
    contents: "90 CAPSULE",
    price: 981,
    mrp: 1402,
    discountPercent: 30,
    imageUrl: "/images/placeholders/product-placeholder.svg",
  },
  {
    label: "PACK OF 2",
    badge: "Best Seller",
    contents: "60 CAPSULE",
    price: 682,
    mrp: 841,
    discountPercent: 20,
    imageUrl: "/images/placeholders/product-placeholder.svg",
  },
];

function PromoStrip({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div className="mt-[15px] md:mt-[20px] py-[10px] md:py-[5px] flex w-fit items-start md:items-center gap-2 btn-radius-10 bg-[#045830] px-[15px] md:px-[20px] shadow-sm promo-flash">
      <SafeImage
        src="/images/product/discount-icon.svg"
        alt="Discount Icon"
        width={18}
        height={18}
        className="object-contain mt-[5px] md:mt-[0px]"
      />
      <div className="font-outfit txt-p font-medium text-white uppercase">
        {text}
      </div>
    </div>
  );
}

export function ProductHero({ product, promoText, overallRating, totalReviews }: { product?: any; promoText?: string; overallRating?: number; totalReviews?: number }) {
  const images = useMemo(
    () => (product?.images?.length ? product.images : defaultImages),
    [product?.images],
  );
  const packOptions = useMemo(
    () =>
      product?.packOptions?.length ? product.packOptions : defaultPackOptions,
    [product?.packOptions],
  );

  // --- Component State & Refs ---
  // Refs for smooth horizontal scrolling of various sliders
  const scrollRef = useRef<HTMLDivElement>(null);
  const imgScrollRef = useRef<HTMLDivElement>(null);
  const mobileThumbScrollRef = useRef<HTMLDivElement>(null);

  // Core Product State
  const thumbListRef = useRef<HTMLDivElement>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [thumbOffset, setThumbOffset] = useState(0); // initial value 0
  const isSyncingRef = useRef(false);

  // Use global store for pack selection to sync with sticky bar
  const selectedPack = useProductStore((s) => s.selectedPackLabel);
  const setSelectedPack = useProductStore((s) => s.setSelectedPackLabel);
  const selectedPackRef = useRef(selectedPack);
  useEffect(() => { selectedPackRef.current = selectedPack; }, [selectedPack]);

  useEffect(() => {
    const isValid = packOptions.some((p: any) => p.label === selectedPack);
    if (!isValid && packOptions.length > 0) {
      setSelectedPack(packOptions[0].label);
    }
  }, [packOptions, selectedPack, setSelectedPack]);

  const [qty, setQty] = useState(1); // Tracks purchase quantity
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- Navigation Helpers ---
  const nextImg = () => setImgIdx((prev) => (prev + 1) % images.length);
  const prevImg = () =>
    setImgIdx((prev) => (prev - 1 + images.length) % images.length);

  // Cart interaction
  const addItem = useAddToCart();

  // Derive the complete data for the currently selected pack
  const pack = useMemo(
    () =>
      packOptions.find((p: any) => p.label === selectedPack) ?? packOptions[0]!,
    [selectedPack, packOptions],
  );

  // --- Synchronization Effects ---

  // 1. Pack to Image Sync: When a user explicitly selects a new pack (e.g. "Pack of 2"),
  //    find its associated image and automatically scroll the main image gallery to it.
  useEffect(() => {
    if (pack?.image) {
      const idx = images.findIndex(
        (img: any) => (typeof img === "string" ? img : img.url) === pack.image,
      );
      if (idx !== -1 && idx !== imgIdx) {
        isSyncingRef.current = true;
        setImgIdx(idx);
        // Also scroll mobile swiper if active
        if (imgScrollRef.current) {
          imgScrollRef.current.scrollTo({
            left: imgScrollRef.current.clientWidth * (idx + 1), // Offset by 1 for clone
            behavior: "smooth",
          });
        }
        // Release the sync lock after a delay to allow scroll to complete
        const timer = setTimeout(() => {
          isSyncingRef.current = false;
        }, 500);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPack, images]); // Removed idx/imgIdx from dependencies to prevent self-triggering

  // 2. Image to Pack Sync: When a user changes the image (thumbnail click, arrows, swipe),
  //    check if the new image is associated with a specific pack and update the selection.
  //    selectedPack intentionally excluded from deps — use ref to avoid re-running on pack click.
  useEffect(() => {
    if (isSyncingRef.current) return;

    const currentImage = images[imgIdx];
    const currentUrl =
      typeof currentImage === "string" ? currentImage : currentImage?.url;

    if (!currentUrl) return;

    const matchingPack = packOptions.find((p: any) => p.image === currentUrl);

    if (matchingPack && matchingPack.label !== selectedPackRef.current) {
      setSelectedPack(matchingPack.label);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgIdx, images, packOptions, setSelectedPack]);

  const mainImage = useMemo(() => {
    const img = images[imgIdx];
    return typeof img === "string" ? { url: img, altText: "" } : img;
  }, [images, imgIdx]);

  const scrollPacks = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.8;
      scrollRef.current.scrollTo({
        left:
          direction === "left"
            ? scrollLeft - scrollAmount
            : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // --- Image Cloning for Infinite Loop (Mobile Only) ---
  const displayImages = useMemo(() => {
    if (images.length <= 1) return images;
    // Clone first and last images for seamless loop
    return [images[images.length - 1], ...images, images[0]];
  }, [images]);

  // Initial scroll to the "real" first image (index 1) on mobile
  const [hasInitializedScroll, setHasInitializedScroll] = useState(false);
  useEffect(() => {
    if (
      !hasInitializedScroll &&
      imgScrollRef.current &&
      window.innerWidth < 1280
    ) {
      imgScrollRef.current.scrollLeft = imgScrollRef.current.clientWidth;
      setHasInitializedScroll(true);
    }
  }, [hasInitializedScroll]);

  // Handles automatic index tracking and infinite loop resets
  const handleImgScroll = () => {
    const container = imgScrollRef.current;
    if (!container) return;

    const { scrollLeft, clientWidth } = container;
    if (clientWidth === 0) return;

    // 1. Detect if we are at the cloned boundaries
    // Reached the LEFT clone (original last image)
    if (scrollLeft <= 0) {
      container.scrollTo({
        left: clientWidth * images.length,
        behavior: "instant",
      });
      return;
    }
    // Reached the RIGHT clone (original first image)
    if (scrollLeft >= clientWidth * (images.length + 1)) {
      container.scrollTo({ left: clientWidth, behavior: "instant" });
      return;
    }

    // 2. Update the visual index (subtract 1 because of the prepended clone)
    const idx = Math.round(scrollLeft / clientWidth) - 1;
    // Ensure idx stays within original bounds for state/thumbnails
    const boundedIdx = Math.max(0, Math.min(images.length - 1, idx));
    if (boundedIdx !== imgIdx) {
      setImgIdx(boundedIdx);
    }
  };

  // --- Modal Close on Escape ---
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };
    if (isModalOpen) {
      window.addEventListener("keydown", handleEsc);
    }
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isModalOpen]);

  // Programmatically scrolls the main flex container to the target image index
  const scrollToImg = (idx: number) => {
    setImgIdx(idx);
    if (imgScrollRef.current) {
      // Offset by 1 for the cloned prepended image
      imgScrollRef.current.scrollTo({
        left: imgScrollRef.current.clientWidth * (idx + 1),
        behavior: "smooth",
      });
    }
  };

  // Mobile boundary-aware arrow navigation
  const scrollMobile = (dir: "left" | "right") => {
    const container = imgScrollRef.current;
    if (!container) return;
    const width = container.clientWidth;
    container.scrollBy({
      left: dir === "left" ? -width : width,
      behavior: "smooth",
    });
  };

  return (
    <>
      <section className="w-full max-w-[100vw] overflow-clip bg-white px-50">
        <div className="mx-auto max-w-[1920px] section-padding-30">
          <div className="grid grid-cols-1 gap-[20px] lg:grid-cols-2 lg:gap-[20px] xl:gap-[20px] 3xl:gap-[45px]">
            {/* Images Section */}
            <div className="flex flex-col xl:flex-row gap-[20px] xl:gap-[20px] lg:sticky lg:top-[125px] self-start z-10 w-full">
              {/* ── Desktop Vertical Thumbnail Strip (xl+) ── */}
              {(() => {
                const THUMB_H = 112; // 100px thumb + 12px gap
                const VISIBLE = 5;
                const maxOffset = Math.max(0, images.length - VISIBLE);

                const navigateTo = (newIdx: number) => {
                  scrollToImg(newIdx);
                  // Auto-scroll thumb window to keep selection visible
                  setThumbOffset((o) => {
                    if (newIdx < o) return newIdx;
                    if (newIdx >= o + VISIBLE) return newIdx - VISIBLE + 1;
                    return o;
                  });
                };

                return (
                  <div className="hidden xl:flex xl:w-[110px] xl:shrink-0 xl:flex-col xl:items-center gap-[10px]">
                    {/* UP arrow — previous image */}
                    <button
                      aria-label="Previous image"
                      disabled={imgIdx === 0}
                      onClick={() => navigateTo(Math.max(0, imgIdx - 1))}
                      className="flex h-[32px] w-[32px] items-center justify-center disabled:opacity-30 transition-opacity"
                    >
                      <SafeImage
                        src="/images/homepage/mobile-menu-arrow-down.svg"
                        alt="up"
                        width={22}
                        height={22}
                        className="rotate-180"
                      />
                    </button>

                    {/* Clipping window — exactly 5 thumbnails tall */}
                    <div
                      className="overflow-hidden thumbnail-list-size"
                      style={{ height: `650px` }}
                    >
                      {/* Sliding inner list */}
                      <div
                        className="flex flex-col gap-[12px] transition-transform duration-300 ease-in-out"
                        style={{
                          transform: `translateY(-${thumbOffset * THUMB_H}px)`,
                        }}
                      >
                        {images.map((img: any, i: number) => {
                          const src = typeof img === "string" ? img : img.url;
                          return (
                            <button
                              key={`${src}-${i}`}
                              onClick={() => navigateTo(i)}
                              aria-label={`Select image ${i + 1}`}
                              className={`relative h-[100px] w-[100px] shrink-0 transition-colors flex items-stretch ${
                                i === imgIdx
                                  ? "rounded-[5px] border-2 border-[#121212] p-[4px]"
                                  : "overflow-hidden"
                              }`}
                            >
                              <div className="relative w-full h-full overflow-hidden">
                                <SafeImage
                                  src={src}
                                  alt={img.altText || ""}
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* DOWN arrow — next image */}
                    <button
                      aria-label="Next image"
                      disabled={imgIdx >= images.length - 1}
                      onClick={() =>
                        navigateTo(Math.min(images.length - 1, imgIdx + 1))
                      }
                      className="flex h-[32px] w-[32px] items-center justify-center disabled:opacity-30 transition-opacity"
                    >
                      <SafeImage
                        src="/images/homepage/mobile-menu-arrow-down.svg"
                        alt="down"
                        width={22}
                        height={22}
                      />
                    </button>
                  </div>
                );
              })()}

              {/* Main image / Mobile Swiper */}
              <div className="relative w-full flex-1 overflow-hidden md:px-[20px]">
                {/* Mobile Arrows (On Image) - Centered Vertically */}
                <div className="absolute top-[181px] -translate-y-1/2 left-4 z-10 flex items-center xl:hidden">
                  <button
                    onClick={() => scrollMobile("left")}
                    className="flex items-center justify-center rounded-full bg-[#045830]/80 text-white shadow-md active:scale-95 transition-opacity"
                  >
                    <SafeImage
                      src="/images/product/product-slider-left-arrow.svg"
                      alt="left-arrow"
                      className="h-[45px] w-[45px] md:h-[60px] md:w-[60px]"
                      width={60}
                      height={60}
                    />
                  </button>
                </div>
                <div className="absolute top-[181px] -translate-y-1/2 right-4 z-10 flex items-center xl:hidden">
                  <button
                    onClick={() => scrollMobile("right")}
                    className="flex items-center justify-center rounded-full bg-[#045830]/80 text-white shadow-md active:scale-95 transition-opacity"
                  >
                    <SafeImage
                      src="/images/product/product-slider-left-right.svg"
                      alt="right-arrow"
                      className="h-[45px] w-[45px] md:h-[60px] md:w-[60px]"
                      width={60}
                      height={60}
                    />
                  </button>
                </div>

                <div
                  ref={imgScrollRef}
                  onScroll={handleImgScroll}
                  className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide xl:block xl:pt-0"
                >
                  {displayImages.map((img: any, i: number) => {
                    const src = typeof img === "string" ? img : img.url;
                    return (
                      <div
                        key={`infinite-${src}-${i}`}
                        className="relative aspect-square w-full min-w-full snap-center shrink-0 sm:aspect-auto sm:h-[480px] xl:hidden"
                      >
                        <SafeImage
                          src={src}
                          alt={
                            img.altText ||
                            product?.name ||
                            "PunchRaksha product"
                          }
                          fill
                          className="object-contain"
                          priority={i === 1}
                        />
                      </div>
                    );
                  })}

                  {/* Desktop Static Image */}
                  <div className="hidden xl:block relative group">
                    <SafeImage
                      src={mainImage.url}
                      alt={
                        mainImage.altText ||
                        product?.name ||
                        "PunchRaksha product"
                      }
                      width={800}
                      height={800}
                      priority
                      className="cursor-pointer"
                      onClick={() => setIsModalOpen(true)}
                    />

                    {/* Desktop Hover Arrows */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImg();
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-white/80 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                      aria-label="Previous image"
                    >
                      <SafeImage
                        src="/images/product/product-slider-left-arrow.svg"
                        alt="arrow-left"
                        width={45}
                        height={45}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImg();
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-white/80 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                      aria-label="Next image"
                    >
                      <SafeImage
                        src="/images/product/product-slider-left-right.svg"
                        alt="arrow-right"
                        width={45}
                        height={45}
                      />
                    </button>
                  </div>
                </div>

                {/* Zoom button — absolute over the image area, xl hidden (desktop has its own) */}
                <button
                  aria-label="Expand image"
                  onClick={() => setIsModalOpen(true)}
                  className="absolute right-[12px] top-[10px] z-20 xl:hidden rounded-full bg-white/60 flex h-[44px] w-[44px] items-center justify-center sm:h-[54px] sm:w-[54px]"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 3H3v6M15 21h6v-6M21 9V3h-6M3 15v6h6"
                      stroke="#121212"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>

                {/* Pagination Dots (Mobile) */}
                <div className="mt-[20px] flex justify-center gap-2 xl:hidden">
                  {images.map((_: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => scrollToImg(i)}
                      className={`h-2 w-2 rounded-full transition-all ${i === imgIdx ? "bg-[#045830] w-4" : "bg-black/20"}`}
                      aria-label={`Go to image ${i + 1}`}
                    />
                  ))}
                </div>

                {/* Mobile Horizontal Thumbnails */}
                <div className="mt-[20px] flex flex-nowrap overflow-x-auto gap-3 pb-2 scrollbar-hide xl:hidden">
                  {images.map((img: any, i: number) => {
                    const src = typeof img === "string" ? img : img.url;
                    return (
                      <button
                        key={`m-thumb-${i}`}
                        onClick={() => scrollToImg(i)}
                        className={`relative h-[64px] w-[64px] shrink-0 overflow-hidden border-2 transition-all ${
                          i === imgIdx
                            ? "border-[#292929] rounded-[11px]"
                            : "border-black/5"
                        }`}
                      >
                        <SafeImage src={src} alt="" fill className="object-cover" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="xl:pl-[10px]">
              <h1 className="font-outfit txt-h1">
                <span className="font-semibold">
                  {product?.name || "100% Ayurvedic Medicine for Piles: "}
                </span>
                {product?.secondaryName && (
                  <span className="font-normal ml-1.5">
                    {product.secondaryName}
                  </span>
                )}
                {!product?.name && !product?.secondaryName && (
                  <span className="font-medium ml-1.5">
                    (Herbal Piles Tablet) | Complete Natural Formula
                  </span>
                )}
              </h1>
              <div className="flex flex-col">
                <p className="mt-[15px] md:mt-[10px] font-outfit txt-p-lg order-2 xl:order-1">
                  {product?.shortDescription ||
                    "Eradicate the root causes of Piles with scientifically-backed Ayurvedic Solution."}
                </p>

                <button
                  type="button"
                  onClick={() => document.getElementById("customer-reviews")?.scrollIntoView({ behavior: "smooth" })}
                  className="mt-[10px] md:mt-[20px] flex items-center gap-3 order-1 xl:order-3 cursor-pointer bg-transparent border-none p-0"
                >
                  <StarRating value={overallRating ?? product?.overallRating ?? 0} />
                  <div className="pt-[2px] product-rating star-rating !pl-[0px]">
                    {(overallRating ?? product?.overallRating ?? 0).toFixed(1)} rating |{" "}
                    {(totalReviews ?? product?.totalReviews ?? 0)} review{(totalReviews ?? product?.totalReviews ?? 0) !== 1 ? "s" : ""}
                  </div>
                </button>
                {/* Dynamic Product Tags */}
                {product?.tags && product.tags.length > 0 && (
                  <div className="mt-[15px] md:mt-[20px] flex flex-wrap gap-2 order-3 md:gap-3 xl:order-2">
                    {product.tags.map((tag: any, i: number) => (
                      <span
                        key={i}
                        className="px-[10px] md:px-[15px] py-[4px] md:py-[6px] font-outfit product-tag txt-p uppercase rounded-[5px] text-[#121212]"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-[15px] md:mt-[15px] flex flex-wrap items-center gap-3">
                <div className="font-outfit font-[600] txt-div-35">
                  {formatPrice(pack.price)}
                </div>
                <div className="font-outfit font-semibold tracking-wide text-[#8a8a8a] line-through txt-div-22">
                  {formatPrice(pack.mrp)}
                </div>
                <span className="txt-p font-semibold bg-[#045830] text-white px-3 py-[2px] btn-radius-10 font-outfit">
                  {pack.discountPercent}% OFF
                </span>
              </div>

              <div className="font-outfit txt-p font-normal text-[#8a8a8a] underline decoration-[#8a8a8a]/40 underline-offset-4 md:pt-[5px]">
                (inclusive of all taxes | Proudly Made in India)
              </div>

              <PromoStrip text={promoText} />

              {/* --- Unified Pack Selector --- */}
              <div className="mt-[15px] xl:mt-[20px]">
                <p className="txt-p-lg mb-[10px] xl:hidden">Size:</p>
                <div
                  ref={scrollRef}
                  className="flex flex-col xl:flex-row flex-nowrap xl:overflow-x-auto gap-4 xl:gap-[12px] xl:pt-[22px] xl:pb-4 xl:snap-x xl:snap-mandatory scrollbar-hide sm:px-1"
                >
                  {packOptions.map((p: any) => {
                    const isSelected = selectedPack === p.label;
                    return (
                      <button
                        key={p.label}
                        className={`relative w-full xl:w-[272px] shrink-0 xl:snap-center rounded-[5px] xl:rounded-[10px] md:flex-1 text-left xl:text-center border xl:shadow-sm transition-all duration-200
                          flex flex-row xl:flex-col items-center gap-4 xl:gap-0 !pt-[5px] p-[10px] xl:p-0 xl:!pt-0
                          ${
                            isSelected
                              ? "border-[#045830] bg-[#045830] opacity-100"
                              : "border-[#121212] xl:border-black/15 bg-white xl:hover:border-[#045830]/50 opacity-60"
                          }`}
                        onClick={() => setSelectedPack(p.label)}
                      >
                        {/* Selected Badge */}
                        {p.badge && (
                          <div
                            className={`absolute z-10 whitespace-nowrap font-outfit txt-p font-semibold leading-normal transition-all duration-200
                            -top-3 right-4 rounded-[5px] px-3 py-[2px] 
                            xl:left-1/2 xl:top-0.5 xl:-translate-x-1/2 xl:-translate-y-1/2 xl:rounded-[10px] xl:py-[5px] xl:right-auto xl:shadow-sm
                            ${isSelected ? "bg-[#b8e28a] text-[#045830] xl:bg-[#A4D25E] xl:text-[#292929]" : "bg-[#045830] text-white xl:bg-[#8ba596] xl:text-white"}`}
                          >
                            {p.badge}
                          </div>
                        )}

                        {/* Image Box */}
                        <div
                          className="shrink-0 overflow-hidden relative 
                          h-[60px] w-[60px] lg:h-[60px] lg:w-[60px] mt-[5px]
                          xl:mt-[15px] 3xl:mt-[15px] xl:mx-auto md:btn-radius-10 xl:bg-white select-box-img"
                        >
                          <div className="relative h-full w-full">
                            <SafeImage
                              src={
                                p.image ||
                                p.imageUrl ||
                                images[0]?.url ||
                                "/images/placeholders/product-placeholder.svg"
                              }
                              alt={p.label}
                              fill
                              className="object-contain"
                            />
                          </div>
                        </div>

                        {/* Text Details Box */}
                        <div className="flex flex-1 flex-row xl:flex-col justify-between items-center xl:pb-[15px] xl:pt-[25px] w-full">
                          {/* Label and Content */}
                          <div
                            className={`flex flex-col items-start xl:items-center justify-center gap-[8px] md:gap-[5px] mt-[5px] md:mt-[10px] xl:mt-0 ${isSelected ? "text-white" : "text-[#121212] xl:text-[#4a4a4a]"}`}
                          >
                            <div className="font-outfit font-medium uppercase txt-div-18 md:txt-div-30 md:mb-[5px] xl:mb-[10px] max-md:text-[14px] max-md:leading-none">
                              {p.label}
                            </div>
                            <div
                              className={`font-outfit font-medium txt-div-16 md:txt-p-lg max-md:text-[12px] max-md:leading-none ${isSelected ? "text-[#CCCCCC]" : "text-[#767676] xl:text-[#8a8a8a]"}`}
                            >
                              {p.contents}
                            </div>
                          </div>

                          {/* Price & Discount */}
                          <div className="flex flex-row xl:flex-col items-center xl:justify-center gap-3 xl:gap-[10px] mt-[2px] lg:mt-[10px]">
                            {/* Discount badge */}
                            <span
                              className={`order-2 xl:order-1 shrink-0 font-outfit font-bold md:!font-semibold txt-p !text-[12px] md:!txt-p
                              rounded-[4px] px-2 py-[2px] bg-[#b8e28a] text-[#045830] 
                              xl:rounded-[10px] xl:px-3 
                              ${isSelected ? "xl:bg-[#A4D25E] xl:text-[#121212]" : "xl:bg-[#e2ecc8] xl:text-[#121212]"}`}
                            >
                              {p.discountPercent}% OFF
                            </span>

                            {/* Price / MRP */}
                            <div className="order-1 xl:order-2 flex flex-col xl:flex-row items-end xl:items-center xl:justify-center xl:gap-[6px]">
                              <div
                                className={`font-outfit !text-[22px] txt-div-35 md:!txt-div-35 font-medium md:font-semibold max-md:mt-[2px] ${isSelected ? "text-white" : "text-text-main"}`}
                              >
                                {formatPrice(p.price)}
                              </div>
                              <div
                                className={`font-outfit text-[14px] xl:text-[22px] font-semibold line-through tracking-wide xl:pl-[5px] leading-tight ${isSelected ? "text-[#CCCCCC]" : "text-[#767676] xl:text-[#8a8a8a]"}`}
                              >
                                {formatPrice(p.mrp)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* --- Action Row (Quantity & Add to Cart) --- */}
              <div className="mt-[15px] md:mt-[20px] flex flex-col items-start gap-2 w-full">
                <p className="txt-p-lg xl:hidden">Quantity:</p>
                <div className="flex w-full items-stretch gap-4">
                  <div className="inline-flex min-h-[56px] w-[118px] md:w-[163px] shrink-0 items-center justify-between border border-[#121212] rounded-[5px] bg-[#f9faf9] px-2 py-[15px] shadow-sm">
                    <button
                      className="flex-1 self-stretch p-2 flex items-center justify-center txt-p-lg font-outfit text-[#121212]"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      aria-label="Decrease quantity"
                    >
                      <SafeImage
                        src="/images/homepage/minus.svg"
                        alt="minus"
                        width={10}
                        height={10}
                      />
                    </button>
                    <span className="px-2 txt-p-lg font-semibold text-[#767676] font-outfit">
                      {qty}
                    </span>
                    <button
                      className="flex-1 self-stretch p-2 flex items-center justify-center txt-p-lg font-outfit text-[#121212]"
                      onClick={() => setQty((q) => Math.min(99, q + 1))}
                      aria-label="Increase quantity"
                    >
                      <SafeImage
                        src="/images/homepage/plus.svg"
                        alt="plus"
                        width={10}
                        height={10}
                      />
                    </button>
                  </div>

                  <ButtonBase
                    className="txt-div-22 h-auto min-h-[56px] w-full flex-1 bg-[#045830] font-outfit text-white shadow transition-colors hover:bg-[#034d2a] btn-shine"
                    onClick={() =>
                      addItem(
                        {
                          productId: product?._id || "punchraksha-piles",
                          name: product?.name || "PunchRaksha Piles Relief Tablet",
                          secondaryName: product?.secondaryName,
                          label: product?.label,
                          subLabel: product?.subLabel,
                          packLabel: selectedPack,
                          price: pack.price,
                          mrp: pack.mrp,
                          upiDiscountPercent: product?.upiDiscountPercent || 10,
                          upiMaxDiscount: product?.upiMaxDiscount || 60,
                          cardDiscountPercent: product?.cardDiscountPercent || 5,
                          cardMaxDiscount: product?.cardMaxDiscount || 25,
                          image: images[0]?.url,
                        },
                        qty,
                      )
                    }
                  >
                    BUY NOW
                  </ButtonBase>
                </div>
              </div>

              {/* Quick benefits */}
              <div className="mt-[20px] md:mt-[30px] w-full bg-[#eef6f2] p-[20px] md:p-[30px]">
                <div className="grid grid-cols-1 gap-x-[30px]  gap-y-[15px] md:gap-y-[20px] md:grid-cols-2">
                  {(product?.heroUsps?.filter(Boolean).length
                    ? product.heroUsps.filter(Boolean).slice(0, 4)
                    : product?.benefits?.length
                    ? product.benefits.slice(0, 4)
                    : [
                        "Severe & Chronic Constipation Relief",
                        "Natural & Safe Laxative for Daily Use",
                        "Smooth Bowel Regulation Without Cramps",
                        "Non-Habit Forming Laxative Churna",
                      ]
                  ).map((t: string) => (
                    <div
                      key={t}
                      className="flex gap-[10px] md:gap-[15px] items-start "
                    >
                      <SafeImage
                        src="/images/product/ingredient-arrow.svg"
                        alt="check"
                        width={26}
                        height={16}
                        className="h-[8px] w-[12px] md:w-[26px] md:h-[16px] arrow-mt"
                      />
                      <p className="font-outfit font-normal text-[#121212] txt-p-lg leading-[20px] md:leading-snug">
                        {t}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Product Tabs (Repositioned to right side) */}
              <div className="mt-6 w-full rounded-[6px] bg-[#EEF9F5] border border-[#eef6f2] py-[20px] px-[15px] md:p-[20px] lg:p-[30px] shadow-sm">
                <ProductTabs product={product} />
              </div>

              {/* Trust Badges Section */}
              <div className="trust-badges-section btn-radius-15 ">
                {/* Trust Badges — single unified grid, responsive via classes */}
                {(() => {
                  const badges = [
                    {
                      img: "/images/product/Scientifically Developed & Expert Crafted.svg",
                      alt: "Scientifically Developed & Expert Crafted",
                      label: (
                        <>
                          Scientifically
                          <br />
                          Developed &<br />
                          Expert Crafted
                        </>
                      ),
                    },
                    {
                      img: "/images/product/Advanced Modern Formulation.svg",
                      alt: "Advanced Modern Formulation",
                      label: (
                        <>
                          Advanced
                          <br />
                          Modern
                          <br />
                          Formulation
                        </>
                      ),
                    },
                    {
                      img: "/images/product/Pure Ayurvedic Ingredients.svg",
                      alt: "Pure 100% Ayurvedic Ingredients",
                      label: (
                        <>
                          Pure 100%
                          <br />
                          Ayurvedic
                          <br />
                          Ingredients
                        </>
                      ),
                    },
                    {
                      img: "/images/product/Free Expert Consultation.svg",
                      alt: "Free Expert Consultation",
                      label: (
                        <>
                          Free Expert
                          <br />
                          Consultation
                        </>
                      ),
                    },
                  ];
                  return (
                    <div className="grid grid-cols-2 lg:grid-cols-4 border-white/50">
                      {badges.map((b, i) => {
                        const isLeftCol = i % 2 === 0;
                        const isLastDesk = i === badges.length - 1;
                        return (
                          <div
                            key={i}
                            className={[
                              "relative flex flex-col items-center text-center md:py-0 md:px-[0px]",
                              i >= 2 ? "pt-[30px]" : "",
                            ].join(" ")}
                          >
                            {/* Mobile-only 60%-height vertical divider on left-column items */}
                            {isLeftCol && (
                              <span
                                className={`lg:hidden absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-[121px] ${i === 2 ? "mt-[15px]" : ""} bg-white/50`}
                              />
                            )}
                            {/* Desktop-only 60%-height vertical divider on all except last */}
                            {!isLastDesk && (
                              <span className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-[50%] bg-white/50" />
                            )}
                            <div className="mb-4">
                              <SafeImage
                                src={b.img}
                                alt={b.alt}
                                width={80}
                                height={80}
                                className="h-[50px] w-[50px] lg:w-[80px] lg:h-[80px]"
                              />
                            </div>
                            <div className="text-white txt-p-lg">{b.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Image Expanded Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white p-4 md:p-8">
          <div className="relative h-full w-full max-w-[1000px]">
            <SafeImage
              src={mainImage.url}
              alt={mainImage.altText || product?.name || ""}
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Modal Controls Footer */}
          <div className="mt-8 flex items-center gap-6 pb-4">
            <button
              onClick={prevImg}
              className="group flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-[#045830] border border-[#121212]"
              aria-label="Previous image"
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#121212"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-colors group-hover:stroke-white"
              >
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            <button
              onClick={() => setIsModalOpen(false)}
              className="group flex h-12 w-12 items-center justify-center rounded-full bg-[#121212] text-white transition-opacity hover:opacity-90 hover:bg-[#045830]"
              aria-label="Close modal"
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-colors group-hover:stroke-white"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <button
              onClick={nextImg}
              className="group flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-[#045830] border border-[#121212]"
              aria-label="Next image"
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#121212"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-colors group-hover:stroke-white"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
