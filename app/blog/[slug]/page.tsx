import type { Metadata } from "next";
import Image from "next/image";
import SafeImage from "@/components/common/SafeImage";
import Link from "next/link";
import * as blogsRepo from "@/lib/repositories/blog.repository";
import * as productsRepo from "@/lib/repositories/product.repository";
import { redirect } from "next/navigation";
import { ProductCard, type ProductCardData } from "@/components/ui/ProductCard";

export const revalidate = 60; // 1 minute revalidate

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await blogsRepo.findBySlug(params.slug);

  if (!post) return { title: "Blog Not Found | PunchRaksha" };
  
  return {
    title: post.metaTitle || `${post.title} | PunchRaksha`,
    description: post.metaDescription || post.excerpt,
    alternates: { canonical: `/blog/${params.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `/blog/${params.slug}`,
      type: "article",
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt },
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const post = await blogsRepo.findBySlug(params.slug);

  if (!post) {
    redirect("/blog");
  }

  // Related posts logic
  const relatedPosts = await blogsRepo.findRecentExcluding(post.slug, 3);

  // Fetch exclusive offer product (bestselling)
  const productDocs = (await productsRepo.find(
    { inStock: true, isBestSelling: true, isArchived: { $ne: true } },
    { limit: 1 },
  )) as any[];
  let exclusiveProduct: ProductCardData | null = null;
  if (productDocs.length > 0) {
    const p = productDocs[0];
    const firstPack = p.packOptions && p.packOptions.length > 0 ? p.packOptions[0] : null;
    exclusiveProduct = {
      _id: p._id.toString(),
      name: p.name,
      secondaryName: p.secondaryName,
      label: p.label,
      subLabel: p.subLabel,
      slug: p.slug,
      category: p.category || "Piles Medicine",
      image: p.images?.[0]?.url || "/images/placeholders/product-placeholder.svg",
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
    };
  }

  // Fetch suggested products
  let suggestedProducts: ProductCardData[] = [];
  if (post.suggestedProductIds && post.suggestedProductIds.length > 0) {
    const suggestedDocs = (await productsRepo.find({
      _id: { $in: post.suggestedProductIds },
      inStock: true,
      isArchived: { $ne: true },
    })) as any[];

    // Sort to respect selected order
    const sortedDocs = [...suggestedDocs].sort((a, b) => {
      const idxA = post.suggestedProductIds.indexOf(a._id.toString());
      const idxB = post.suggestedProductIds.indexOf(b._id.toString());
      return idxA - idxB;
    });

    suggestedProducts = sortedDocs.map((p) => {
      const firstPack = p.packOptions && p.packOptions.length > 0 ? p.packOptions[0] : null;
      return {
        _id: p._id.toString(),
        name: p.name,
        secondaryName: p.secondaryName,
        label: p.label,
        subLabel: p.subLabel,
        slug: p.slug,
        category: p.category || "Piles Medicine",
        image: p.images?.[0]?.url || "/images/placeholders/product-placeholder.svg",
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
      };
    });
  }

  return (
    <div className="w-full bg-white">
      <hr />
      <div className="mx-auto max-w-[1920px] px-4 lg:px-[50px] py-[40px] md:py-[70px]">
        {/* Breadcrumb */}
        <div className="mb-[20px] md:mb-[30px] flex flex-wrap items-center gap-[6px] txt-p text-gray-600 font-medium">
          <Link href="/" className="hover:text-black transition-colors">Home</Link>
          <span className="text-[12px] font-bold opacity-70">›</span>
          <Link href="/blog" className="hover:text-black transition-colors">Blog</Link>
          <span className="text-[12px] font-bold opacity-70">›</span>
          <span className="text-black font-semibold truncate max-w-[200px] md:max-w-md">{post.title}</span>
        </div>
        
        <div className="flex flex-col lg:flex-row w-full gap-[30px] lg:gap-[40px] xl:gap-[50px] relative">
          {/* Main Article Content (60%) */}
          <article className="w-full lg:w-[60%] shrink-0 pr-0 xl:pr-[20px]">
            <h1 className="font-outfit text-[32px] md:text-[40px] xl:text-[45px] font-bold text-[#121212] leading-tight mb-[30px]">
              {post.title}
            </h1>
            
            <div className="mb-[40px] rounded-none overflow-hidden border border-gray-100">
              <div className="relative h-[250px] md:h-[450px] w-full bg-gray-50 flex items-center justify-center">
                {post.coverImage && <Image src={post.coverImage} alt={post.title} fill className="object-cover" />}
              </div>
            </div>
            
            <div
              className="prose max-w-none font-outfit text-[16px] md:text-[18px] leading-[32px] text-text-main prose-headings:font-bold prose-headings:text-[#121212] prose-a:text-[#0E512D] prose-img:rounded-md mt-[30px]"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Author Section */}
            {post.author && (
              <div className="mt-12 p-6 md:p-8 bg-[#EDF9F5] border border-[#daefdc] rounded-xl flex flex-row items-center gap-5">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#045830] text-white flex items-center justify-center font-bold text-xl md:text-2xl shrink-0 shadow-md">
                  {post.author.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-outfit text-lg font-bold text-gray-900 leading-tight">
                    Written by {post.author}
                  </h4>
                  <p className="font-outfit text-sm text-[#767676] mt-1 font-medium">
                    Ayurvedic Expert & Medical Advisor at PunchRaksha
                  </p>
                </div>
              </div>
            )}

            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Article",
                  headline: post.title,
                  description: post.excerpt,
                  datePublished: post.publishedAt,
                }),
              }}
            />
          </article>

          {/* Vertical Divider */}
          <div className="hidden lg:block w-[1px] bg-gray-200 shrink-0 self-stretch"></div>

          {/* Right Sidebar (40%) */}
          <aside className="w-full lg:flex-1 shrink-0 h-fit sticky top-[120px] flex flex-col gap-6 pl-0 xl:pl-[10px]">
            {suggestedProducts.length > 0 ? (
              <div className="flex flex-col gap-6 w-full">
                <h3 className="font-outfit text-[22px] md:text-[26px] font-bold text-gray-950 mb-1 leading-none uppercase tracking-wider text-[#045830]">
                  Suggested Products
                </h3>
                <div className="flex flex-col gap-5">
                  {suggestedProducts.map((p) => (
                    <ProductCard key={p._id} product={p} />
                  ))}
                </div>
              </div>
            ) : exclusiveProduct ? (
              <div className="bg-[#EBF7F2] p-6 lg:p-[35px] flex flex-col items-center w-full">
                <h3 className="font-outfit text-[22px] md:text-[26px] font-semibold text-[#121212] mb-[2px] text-center leading-none">
                  Buy Piles Medicine
                </h3>
                <p className="font-outfit text-[14px] md:text-[16px] font-semibold text-[#32B440] mb-[30px] text-center">
                  Get 10% Discount <span className="font-medium text-[#50ae57]">on Prepaid Orders</span>
                </p>
                
                <div className="w-full max-w-[500px] mx-auto">
                  <div className="bg-white p-4 shadow-sm w-full mb-6 relative border border-gray-100 flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                    {/* Product Image exactly referencing DB to prevent hardcoded custom images */}
                    <div className="relative w-[130px] h-[130px] sm:w-[150px] sm:h-[150px] shrink-0 bg-[#fef4f4] flex items-center justify-center overflow-hidden">
                      <SafeImage src={exclusiveProduct.image || "/images/PunchRaksha_Product.png"} alt="Product" fill className="object-cover" />
                    </div>
                    
                    {/* Product details */}
                    <div className="flex flex-col justify-center w-full flex-1">
                      {(exclusiveProduct.label || exclusiveProduct.subLabel) ? (
                        <>
                          <h4 className="font-outfit text-[18px] md:text-[20px] font-semibold text-[#045830] mb-[4px] leading-tight">
                            {exclusiveProduct.label}
                          </h4>
                          {exclusiveProduct.subLabel && (
                            <p className="font-outfit text-[13px] md:text-[14px] text-[#767676] mb-2 font-medium bg-transparent border-0 !p-0">
                              {exclusiveProduct.subLabel}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <h4 className="font-outfit text-[18px] md:text-[20px] font-semibold text-[#121212] mb-[4px] leading-tight">
                            {exclusiveProduct.name}
                          </h4>
                          <p className="font-outfit text-[13px] md:text-[14px] text-gray-700 mb-2 font-medium bg-transparent border-0 !p-0">
                            {exclusiveProduct.secondaryName || exclusiveProduct.category || "Constipation | Regular Bowel Movements"}
                          </p>
                        </>
                      )}
                      
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex text-[#F59E0B] text-[16px]">
                          ★★★★★
                        </div>
                        <span className="text-[13px] md:text-[14px] text-gray-500 font-outfit font-medium">4.7 rating | 489 review</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3 mt-1 font-outfit">
                        <span className="text-[25px] font-bold text-[#121212] leading-none">₹{exclusiveProduct.price}</span>
                        <span className="text-[16px] text-[#767676] line-through font-semibold leading-none mr-2">₹{exclusiveProduct.mrp}</span>
                        <span className="text-[12px] bg-[#045830] text-white px-2 py-1 rounded-[4px] font-semibold tracking-wider">
                          {exclusiveProduct.discountPercent}% OFF
                        </span>
                      </div>
                      
                      <div className="relative w-[130px]">
                        <select className="appearance-none border border-gray-400 bg-white rounded-[5px] pl-3 pr-8 py-1.5 w-full text-[13px] font-outfit font-medium focus:outline-none">
                          <option>{exclusiveProduct.packLabel || "PACK OF '1'"}</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center gap-[15px] w-full">
                    {/* Qty Selector */}
                    <div className="flex items-center justify-between border border-[#121212] bg-white w-[110px] h-[52px] shrink-0 rounded-[5px]">
                      <button className="w-10 h-full flex items-center justify-center text-[#121212] text-xl hover:bg-gray-50">-</button>
                      <span className="text-[#121212] font-medium font-outfit">1</span>
                      <button className="w-10 h-full flex items-center justify-center text-[#121212] text-xl hover:bg-gray-50">+</button>
                    </div>
                    {/* Add to cart / BUY NOW */}
                    <Link href={`/product/${exclusiveProduct.slug}`} className="flex-grow flex items-center justify-center h-[52px] bg-[#045830] text-white font-outfit font-medium text-[16px] rounded-[5px] hover:bg-[#034620] transition-colors">
                      BUY NOW
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}
            
            {/* Outline Button below Green Box */}
            <Link href="/products" className="flex w-full max-w-[500px] mx-auto items-center justify-center h-[54px] border border-[#045830] text-[#045830] bg-white font-outfit font-bold text-[16px] tracking-wide rounded-[5px] hover:bg-gray-50 transition-colors mt-2">
              BROWSE ALL PRODUCTS
            </Link>
          </aside>
        </div>

        {/* More Practical Articles (Bottom Related Posts) */}
        {relatedPosts.length > 0 && (
          <div className="mt-[100px] pt-[40px] border-t border-gray-100">
            <h2 className="text-center font-outfit text-[32px] font-semibold tracking-[1px] text-text-main mb-[50px]">
              More practical articles
            </h2>
            <div className="grid grid-cols-1 gap-x-[30px] gap-y-[50px] md:grid-cols-2 xl:grid-cols-3">
              {relatedPosts.map((rp) => (
                <Link key={rp.slug} href={`/blog/${rp.slug}`} className="mx-auto block w-full max-w-[590px] group">
                  <div className="shadow-none transition-shadow hover:shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] border border-gray-100">
                    <div className="relative h-[310px] w-full bg-gray-50 overflow-hidden">
                      {rp.coverImage && <Image src={rp.coverImage} alt={rp.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />}
                    </div>
                  </div>
                  <p className="mt-6 text-center font-outfit text-[18px] font-semibold md:text-[20px] text-text-main group-hover:text-[#045830] transition-colors lg:px-4">
                    {rp.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
