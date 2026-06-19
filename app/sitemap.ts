import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "/",
    "/product/punchraksha-piles-medicine",
    "/all-products",
    "/blog",
    "/about",
    "/contact",
    "/faq",
    "/testimonial",
    "/privacy-policy",
    "/refund-policy",
    "/terms",
    "/login",
  ];

  const now = new Date();
  return routes.map((r) => ({
    url: absoluteUrl(r),
    lastModified: now,
    changeFrequency: r === "/" ? "daily" : "weekly",
    priority: r === "/" ? 1 : 0.7,
  }));
}

