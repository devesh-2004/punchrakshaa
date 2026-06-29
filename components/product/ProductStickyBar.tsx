"use client";
import SafeImage from "@/components/common/SafeImage";
import { useState, useEffect, useMemo } from "react";
import { formatPrice } from "@/lib/utils/formatPrice";
import { useCartStore } from "@/lib/cart/cartStore";
import { useAddToCart } from "@/lib/cart/useAddToCart";
import { useProductStore } from "@/lib/store/productStore";
import { ButtonBase } from "../ui/ButtonBase";
import { ChevronDown } from "lucide-react";

export function ProductStickyBar({ product }: { product: any }) {
  const [isVisible, setIsVisible] = useState(true);
  const packOptions = useMemo(() => product?.packOptions || [], [product?.packOptions]);

  const [isMobileReady, setIsMobileReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobileReady(true);
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Use global store for pack selection to sync with ProductHero
  const selectedPackLabel = useProductStore((s) => s.selectedPackLabel);
  const setSelectedPackLabel = useProductStore((s) => s.setSelectedPackLabel);

  const addItem = useAddToCart();

  const selectedPack = useMemo(() => {
    if (!selectedPackLabel || packOptions.length === 0) return packOptions[0];
    return packOptions.find((p: any) => p.label === selectedPackLabel) || packOptions[0];
  }, [selectedPackLabel, packOptions]);

  // Sync effect: Ensure the global store has a valid selection for the current product
  useEffect(() => {
    const isValid = packOptions.some((p: any) => p.label === selectedPackLabel);
    if (!isValid && packOptions.length > 0) {
      setSelectedPackLabel(packOptions[0].label);
    }
  }, [product?._id, packOptions, selectedPackLabel, setSelectedPackLabel]);

  // Dynamic Thumbnail logic based on selected pack
  const packThumbnail = useMemo(() => {
    if (!selectedPack) return product?.images?.[0]?.url;
    // Check if the current pack has an override image, otherwise default to first product image
    return selectedPack.image || selectedPack.imageUrl || product?.images?.[0]?.url;
  }, [selectedPack, product]);

  useEffect(() => {
    // Component is now visible on load
  }, []);

  const handleBuyNow = () => {
    if (!selectedPack) return;
    addItem({
      productId: product?._id || "punchraksha-piles",
      name: product?.name || "PunchRaksha Piles Relief Tablet",
      secondaryName: product?.secondaryName,
      label: product?.label,
      subLabel: product?.subLabel,
      packLabel: selectedPack.label,
      price: selectedPack.price,
      mrp: selectedPack.mrp,
      upiDiscountPercent: product?.upiDiscountPercent || 10,
      upiMaxDiscount: product?.upiMaxDiscount || 60,
      cardDiscountPercent: product?.cardDiscountPercent || 5,
      cardMaxDiscount: product?.cardMaxDiscount || 25,
      image: selectedPack.image || selectedPack.imageUrl || product?.images?.[0]?.url || "",
    }, 1);
  };

  if (!selectedPack) return null;

  return (
    <div
      className="fixed bottom-0 left-0 w-full bg-white z-[50] border-[1.5px] border-[#000000] shadow-[0_-8px_24px_rgba(0,0,0,0.12)]"
    >
      <div className="md:mx-auto md:max-w-[80%] px-[15px] xl:px-50 py-[15px] md:py-[20px] flex items-center justify-between gap-3 xl:gap-[20px]">

        {/* ── Brand Section (Hidden on Mobile) ── */}
        <div className="hidden xl:flex items-center gap-[20px] shrink-0">
          <div className="relative h-[65px] w-[65px] shrink-0 overflow-hidden border border-[#F2F7F3] flex items-center justify-center">
            <SafeImage
              src={packThumbnail || "/images/placeholders/product-placeholder.svg"}
              alt="product"
              width={65}
              height={65}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col text-left">
            <div className="font-outfit txt-h1 font-medium text-[#121212] leading-tight text-left">
              {(product?.label || product?.subLabel) ? product.label : (product?.name || "100% Ayurvedic Medicine for Piles")}
            </div>
          </div>
        </div>

        {/* ── Controls Section (Adaptive) ── */}
        <div className="flex items-center flex-1 xl:flex-none justify-between gap-[10px] xl:gap-[20px] h-full w-full xl:w-auto">

          {/* Desktop Price Display (Hidden on Mobile) */}
          <div className="hidden xl:flex flex-col items-end shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="font-outfit font-[600]  md:text-[35px] xl:txt-h2-lg text-[#121212]">
                {formatPrice(selectedPack.price)}
              </span>
              <span className="font-outfit font-[600] text-[#8a8a8a] line-through md:text-[20px] xl:text-[25px] font-semibold tracking-[0.025em]">
                {formatPrice(selectedPack.mrp)}
              </span>
            </div>
          </div>

          <div className="relative flex-1 xl:flex-none xl:max-w-[420px] h-[50px] xl:h-[72px] min-w-0">
            <select
              key={product?._id}
              value={selectedPackLabel || packOptions?.[0]?.label || ""}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) return;
                setSelectedPackLabel(value);
              }}
              style={{ WebkitAppearance: "none" }}
              className="w-full h-full appearance-none bg-[#F2F7F3] border border-[#121212] rounded-[10px] md:btn-radius-15 px-[12px] !pr-[32px] xl:px-5 font-medium text-[#121212] cursor-pointer outline-none focus:border-[#045830] hover:bg-opacity-90 max-md:!text-[12px] md:txt-div-22 md:!pr-[40px] tracking-normal md:tracking-[0.03em]"
            >
              {packOptions.map((p: any) => (
                <option key={p.label} value={p.label}>
                  {p.label}{isMobileReady && isMobile ? ` - ${formatPrice(p.price)}` : ""}
                </option>
              ))}
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center mr-[12px] md:!mr-[20px] text-black">
              <SafeImage src="/images/homepage/desktop-menu-arrow.svg" alt="down arrow" width={12} height={12} />
            </div>
          </div>

          {/* Buy Now Button (Adaptive Width) */}
          <ButtonBase
            onClick={handleBuyNow}
            className="flex-1 xl:flex-none xl:w-auto bg-[#045830] text-white font-semibold uppercase h-[50px] xl:h-[72px] px-3 xl:px-[50px] btn-radius-10 hover:bg-[#034d2a] transition-all shadow-md active:scale-95 tracking-wider txt-h2-lg border-none flex items-center justify-center btn-shine"
          >
            BUY NOW
          </ButtonBase>
        </div>
      </div>
    </div>
  );
}
