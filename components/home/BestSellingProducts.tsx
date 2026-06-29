import { ProductSlider } from "./ProductSlider";
import { type ProductCardData } from "@/components/ui/ProductCard";
import * as productsRepo from "@/lib/repositories/product.repository";

export async function BestSellingProducts() {
  const productDocs = (await productsRepo.find(
    { inStock: true, isBestSelling: true, isArchived: { $ne: true } },
    { limit: 4 },
  )) as any[];

  const products: ProductCardData[] = productDocs.map((p) => {
    const firstPack = p.packOptions && p.packOptions.length > 0 ? p.packOptions[0] : null;

    return {
      _id: p._id.toString(),
      name: p.name,
      secondaryName: p.secondaryName,
      label: p.label,
      subLabel: p.subLabel,
      slug: p.slug,
      category: p.category || "Piles Medicine", // Placeholder or from schema if added later
      image: p.featuredImage || p.images?.[0]?.url || "/placeholder/product-400.svg",
      price: firstPack?.price || p.price,
      mrp: firstPack?.mrp || (p.price + (p.price * p.discountPercent) / 100),
      discountPercent: firstPack?.discountPercent || p.discountPercent,
      rating: p.overallRating || 0,
      reviewCount: p.totalReviews || 0,
      packLabel: firstPack?.label || "PACK OF 1",
      upiDiscountPercent: p.upiDiscountPercent || 10,
      upiMaxDiscount: p.upiMaxDiscount || 60,
      cardDiscountPercent: p.cardDiscountPercent || 5,
      cardMaxDiscount: p.cardMaxDiscount || 25,
      featuredLabel: p.featuredLabel || "",
      featuredSubLabel: p.featuredSubLabel || "",
    };
  });

  if (products.length === 0) {
    return null; // Don't render if no products
  }

  return (
    <section className="w-full bg-[#EDF9F5] md:bg-[#DAEFDC] sections-padding overflow-hidden">
      <div className="px-0 md:px-6">
        <h2 className="mb-[30px] text-center font-outfit font-semibold text-[#121212] md:mb-[45px] txt-h2-lg">
          <span className="block">Our Best Selling Products</span>
        </h2>

        <ProductSlider products={products} />
      </div>
    </section>
  );
}

