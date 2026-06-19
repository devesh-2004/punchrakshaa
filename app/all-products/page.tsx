import type { Metadata } from "next";
import Link from "next/link";
import { AllProductsGrid } from "@/components/home/AllProductsGrid";

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return {
    title: "All Products | PunchRaksha",
    description:
      "Browse all PunchRaksha Ayurvedic products for piles, constipation, and digestive health.",
    alternates: { canonical: "/all-products" },
  };
}

export default function AllProductsPage() {
  return (
    <div className="w-full bg-white font-outfit">
      <div className="max-w-[1920px] mx-auto px-4 lg:px-[50px]">
        {/* Title */}
        <h1 className="text-center txt-h1 font-semibold text-[#121212] mt-[30px] mb-[30px] md:mt-[45px] md:mb-[45px] ">
          All Products
        </h1>

        {/* Breadcrumb */}
        <nav className="flex items-center justify-center md:justify-start gap-[6px] txt-div-22 font-outfit tracking-[0.03em] text-[#555] border-t border-b border-[#e5e5e5] py-[15px] md:py-[20px] mb-[30px] md:mb-[60px]">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span className="text-[#888]">›</span>
          <span className="text-[#121212]">All Products</span>
        </nav>

        {/* Product Grid */}
        <div className="pb-[60px]">
          <AllProductsGrid />
        </div>
      </div>
    </div>
  );
}