import { BlogPreviewSection } from "@/components/home/BlogPreviewSection";
import { ConsultationCTA } from "@/components/home/ConsultationCTA";
import { ProductTestimonials } from "@/components/product/ProductTestimonials";
import { Accordion } from "@/components/ui/Accordion";
import { BestSellingProducts } from "@/components/home/BestSellingProducts";
import { RelatedProducts } from "@/components/home/RelatedProducts";
import { CustomerReviews } from "@/components/product/CustomerReviews";
import { ProductBadges } from "@/components/product/ProductBadges";
import { AyurvedicBadges } from "@/components/home/AyurvedicBadges";
import { ProductHero } from "@/components/product/ProductHero";
import { ProductStickyBar } from "@/components/product/ProductStickyBar";
import type { Metadata } from "next";
import * as products from "@/lib/repositories/product.repository";
import * as blogs from "@/lib/repositories/blog.repository";
import * as reviews from "@/lib/repositories/review.repository";
import { getGlobal } from "@/lib/repositories/siteSettings.repository";
import { notFound } from "next/navigation";

import { cache } from "react";

export const revalidate = 60;

// React.cache deduplicates this call within the same request — both
// generateMetadata and the page body share the same DB round-trip.
const getProduct = cache((slug: string) => products.findBySlug(slug));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getProduct(params.slug);
  if (!p || p.isArchived) return { title: "Product Not Found" };

  const title =
    p.metaTitle ||
    `${p.name} – 100% Ayurvedic Piles Relief | PunchRaksha`;

  const description =
    p.metaDescription ||
    p.shortDescription ||
    `Buy ${p.name} – a scientifically-developed, 100% Ayurvedic formula for long-lasting piles relief. Natural ingredients. Free expert consultation. No side effects.`;

  const canonicalUrl = `https://www.punchraksha.com/product/${params.slug}`;
  const rawOgImage = (p as any).ogImageUrl || (p as any).images?.[0]?.url || "";
  const ogImage = rawOgImage && !rawOgImage.startsWith("data:") ? rawOgImage : "/brand/punchraksha-logo.webp";

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: "PunchRaksha",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: (p as any).ogImageAlt || p.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@punchraksha",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const productDoc = await getProduct(params.slug);

  if (!productDoc || productDoc.isArchived) {
    notFound();
  }

  const product = productDoc ? JSON.parse(JSON.stringify(productDoc)) : null;

  const [reviewDocs, stats] = await Promise.all([
    reviews.find({ productId: productDoc._id, status: "approved" }, { sort: { createdAt: -1 }, limit: 50 }),
    reviews.ratingStats(productDoc._id),
  ]);

  const totalReviews = stats.count;
  const overallRating = stats.avg;
  const ratingBreakdown = stats.breakdown;

  const approvedReviews = reviewDocs.map((r) => ({
    name: r.guestName || "Anonymous",
    rating: r.rating,
    title: r.title || undefined,
    body: r.body,
    date: new Date(r.createdAt as Date).toLocaleDateString("en-GB"),
    verified: r.isVerified,
  }));

  const siteSettings = await getGlobal();

  const linkedBlogSlugs: string[] = (product as any).linkedBlogSlugs || [];
  const linkedBlogs = linkedBlogSlugs.length
    ? (await blogs.findBySlugs(linkedBlogSlugs)).map((b) => ({
        slug: b.slug,
        title: b.title,
        image: b.coverImage,
      }))
    : [];

  const faqs = [
    { question: "Why is Ayurveda a better alternative medicine for piles?", answer: "Ayurveda focuses on root causes—digestion, inflammation, and lifestyle—using time-tested herbs and guidelines." },
    { question: "Can I take this natural medicine for piles alongside my current prescription?", answer: "Generally yes, but it’s best to consult your doctor/ayurvedic expert to avoid interactions. Many customers use it as supportive care with guidance." },
    { question: "How long will I have to take this ayurvedic medicine?", answer: "Most users take it consistently for 1–2 months for best results, depending on severity and routine." },
    { question: "Will this product stop bleeding and swelling in the piles?", answer: "It is designed to support relief from bleeding and swelling; results vary by individual and consistency." },
    { question: "What diet should I follow when using PunchRaksha Piles Relief Tablets?", answer: "Hydration, high-fiber meals, and avoiding trigger foods typically help. Follow the guidelines section for tips." },
    { question: "Can I use this product if I am pregnant?", answer: "Not recommended without professional advice. Please consult your doctor before using." },
    { question: "Can I use PunchRaksha Piles Relief Tablets without consulting a doctor?", answer: "You can, but we strongly recommend a quick consultation—especially if you have existing conditions or take other medicines." },
  ];

  return (
    <div className="w-full">
      <ProductHero
        product={product}
        promoText={product.promoStripEnabled ? product.promoStripText : undefined}
        overallRating={overallRating}
        totalReviews={totalReviews}
      />
      {/* <ProductBadges /> */}

      <div id="consultation-cta" className="relative w-full">
        <ConsultationCTA
          className="bg-[#EEF9F5] py-[30px] md:py-[60px]"
          heading={(product as any).consultationHeading || siteSettings.consultation?.heading}
          subheading={(product as any).consultationSubheading || siteSettings.consultation?.subheading}
          description={(product as any).consultationDescription || siteSettings.consultation?.description}
          ctaText={(product as any).consultationCtaText || siteSettings.consultation?.ctaText}
          ctaLink={(product as any).consultationCtaLink || siteSettings.consultation?.ctaLink}
          consultationImage={(product as any).consultationImage || undefined}
          consultationImageAlt={(product as any).consultationImageAlt || undefined}
        />
      </div>

      <ProductTestimonials linkedTestimonialIds={product?.linkedTestimonialIds} heading={(product as any).testimonialsHeading || undefined} />
      <section className="w-full bg-white p-90-60-45 !pb-0 ">
        <AyurvedicBadges heading={(product as any).badgesHeading || siteSettings.badges?.heading} />
      </section>

      {/* FAQ Section */}
      <section className="w-full bg-white p-90-60-45">
        <div className="px-50">
          <h2 className="text-center font-outfit txt-h2-lg font-semibold text-[#121212] mb-[30px] md:mb-[45px]">
            Frequently Asked Questions
          </h2>
          <div className="mx-auto w-full max-w-[1205px]">
            <Accordion items={product?.faqs?.length ? product.faqs : faqs} defaultOpenIndex={1} />
          </div>
        </div>
      </section>
      {product?.relatedProductIds?.length
        ? <RelatedProducts productIds={product.relatedProductIds.map(String)} />
        : <BestSellingProducts />
      }
      <CustomerReviews
        overallRating={overallRating}
        totalReviews={totalReviews}
        ratingBreakdown={ratingBreakdown}
        reviews={approvedReviews}
        productId={product?._id}
      />

      <BlogPreviewSection posts={linkedBlogs.length ? linkedBlogs : undefined} />

      <ProductStickyBar product={product} />
    </div>
  );
}

