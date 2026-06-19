import { type ProductCardData } from "@/components/ui/ProductCard";
import { ProductCard } from "@/components/ui/ProductCard";
import * as productsRepo from "@/lib/repositories/product.repository";

const PLACEHOLDER = "/placeholder/product-400.svg";

function validImageUrl(url: string | undefined | null): string {
  if (!url) return PLACEHOLDER;
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return PLACEHOLDER;
}

export async function AllProductsGrid() {
  const productDocs = (await productsRepo.find(
    { inStock: true, isArchived: { $ne: true } },
    { sort: { isBestSelling: -1, createdAt: -1 } },
  )) as any[];

  const products: ProductCardData[] = productDocs.map((p) => {
    const firstPack = p.packOptions?.[0] ?? null;

    return {
      _id: p._id.toString(),
      name: p.name,
      secondaryName: p.secondaryName,
      slug: p.slug,
      category: p.category || "Piles Medicine",
      image: validImageUrl(p.featuredImage) !== PLACEHOLDER
        ? validImageUrl(p.featuredImage)
        : validImageUrl(p.images?.[0]?.url),
      price: firstPack?.price ?? p.price,
      mrp: firstPack?.mrp ?? p.price + (p.price * p.discountPercent) / 100,
      discountPercent: firstPack?.discountPercent ?? p.discountPercent,
      rating: p.overallRating ?? 0,
      reviewCount: p.totalReviews ?? 0,
      packLabel: firstPack?.label ?? "PACK OF 1",
      upiDiscountPercent: p.upiDiscountPercent ?? 10,
      upiMaxDiscount: p.upiMaxDiscount ?? 60,
      cardDiscountPercent: p.cardDiscountPercent ?? 5,
      cardMaxDiscount: p.cardMaxDiscount ?? 25,
      featuredLabel: p.featuredLabel ?? "",
      featuredSubLabel: p.featuredSubLabel ?? "",
      allPackOptions: (p.packOptions ?? []).map((pack: any) => ({
        label: pack.label,
        price: pack.price,
        mrp: pack.mrp,
        discountPercent: pack.discountPercent,
      })),
    };
  });

  if (products.length === 0) {
    return (
      <div className="py-20 text-center font-outfit text-[#555] txt-p-lg">
        No products available at the moment.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px] md:gap-[20px]">
      {products.map((p) => (
        <ProductCard key={p._id} product={p} />
      ))}
    </div>
  );
}
