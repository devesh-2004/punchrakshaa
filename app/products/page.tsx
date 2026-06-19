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

export default function ProductsPage() {
  return (
    <div className="w-full bg-white font-outfit">
      <div className="w-full bg-[#EEF7F0] pt-[60px] pb-[160px] px-4">
        {/* Title */}
        <h1 className="text-center txt-h1 font-semibold text-[#121212]  mb-[15px] md:mb-[20px]">
          All Products
        </h1>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-[6px] txt-p text-[#555] pb-[30px] md:pb-[40px]">
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
