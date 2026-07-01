import { AyurvedicBadges } from "@/components/home/AyurvedicBadges";
import { BestSellingProducts } from "@/components/home/BestSellingProducts";
import { BlogPreviewSection } from "@/components/home/BlogPreviewSection";
import { ConsultationCTA } from "@/components/home/ConsultationCTA";
import { HeroSection } from "@/components/home/HeroSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { WhyPunchRaksha } from "@/components/home/WhyPunchRaksha";
import { getGlobal } from "@/lib/repositories/siteSettings.repository";
import { getRecent as getRecentBlogs } from "@/lib/repositories/blog.repository";
import type { Metadata } from "next";

export const revalidate = 60;

export function generateMetadata(): Metadata {
  return {
    title: "Natural Health Solutions for Health Problems | Ayurvedic Care",
    description:
      "Discover natural solutions for piles, gas, acidity, diabetes, and cholesterol. Simple, effective, and based on Ayurveda.",
    alternates: { canonical: "https://www.punchraksha.com/" },
    openGraph: {
      title: "Natural Health Solutions for Health Problems | Ayurvedic Care",
      description:
        "Discover natural solutions for piles, gas, acidity, diabetes, and cholesterol. Simple, effective, and based on Ayurveda.",
      url: "https://www.punchraksha.com/",
      type: "website",
      images: [
        {
          url: "/images/homepage/Homepage-content/natural-health-solutions.webp",
          width: 1200,
          height: 630,
          alt: " natural health solutions",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Natural Health Solutions for Health Problems | Ayurvedic Care",
      description:
        "Discover natural solutions for piles, gas, acidity, diabetes, and cholesterol. Simple, effective, and based on Ayurveda.",
      images: ["/images/homepage/Homepage-content/natural-health-solutions.webp"],
    },
  };
}

export default async function Home() {
  const [siteSettings, recentBlogs] = await Promise.all([getGlobal(), getRecentBlogs()]);

  return (
    <div className="w-full">
      <HeroSection />
      <BestSellingProducts />
      <WhyPunchRaksha />
      <AyurvedicBadges heading={siteSettings.badges?.heading} />
      <TestimonialsSection />
      <ConsultationCTA
        className="bg-white section-gap-60 sections-gap"
        heading={siteSettings.consultation?.heading}
        subheading={siteSettings.consultation?.subheading}
        description={siteSettings.consultation?.description}
        ctaText={siteSettings.consultation?.ctaText}
        ctaLink={siteSettings.consultation?.ctaLink}
      />
      <BlogPreviewSection posts={recentBlogs} />
    </div>
  );
}
