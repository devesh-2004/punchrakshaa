import { ProductSlider } from "./ProductSlider";
import { type ProductCardData } from "@/components/ui/ProductCard";
import * as productsRepo from "@/lib/repositories/product.repository";

export async function RelatedProducts({ productIds }: { productIds: string[] }) {
  if (!productIds?.length) return null;

  const productDocs = (await productsRepo.find(
    { _id: { $in: productIds }, isArchived: { $ne: true } },
  )) as any[];

  // Preserve admin-defined order
  const ordered = productIds
    .map(id => productDocs.find(p => p._id.toString() === id))
    .filter(Boolean);

  const products: ProductCardData[] = ordered.map((p) => {
    const firstPack = p.packOptions?.length ? p.packOptions[0] : null;
    return {
      _id: p._id.toString(),
      name: p.name,
      secondaryName: p.secondaryName,
      label: p.label,
      subLabel: p.subLabel,
      slug: p.slug,
      category: p.category || "",
      image: p.featuredImage || p.images?.[0]?.url || "/placeholder/product-400.svg",
      price: firstPack?.price || p.price,
      mrp: firstPack?.mrp || p.price,
      discountPercent: firstPack?.discountPercent || p.discountPercent,
      rating: p.overallRating || 0,
      reviewCount: p.totalReviews || 0,
      packLabel: firstPack?.label || "PACK OF 1",
      upiDiscountPercent: p.upiDiscountPercent || 10,
      upiMaxDiscount: p.upiMaxDiscount || 60,
      cardDiscountPercent: p.cardDiscountPercent || 5,
      cardMaxDiscount: p.cardMaxDiscount || 25,
    };
  });

  if (products.length === 0) return null;

  return (
    <section className="w-full bg-[#EDF9F5] md:bg-[#DAEFDC] sections-padding overflow-hidden">
      <div className="px-0 md:px-6">
        <h2 className="mb-[30px] text-center font-outfit font-semibold text-[#121212] md:mb-[45px] txt-h2-lg">
          Similar Products
        </h2>
        <ProductSlider products={products} />
      </div>
    </section>
  );
}
