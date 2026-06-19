import type { Metadata } from "next";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return {
    title: "Testimonials | PunchRaksha",
    description: "Real customer stories and video testimonials.",
    alternates: { canonical: "/testimonial" },
  };
}

export default function TestimonialPage() {
  return (
    <div className="w-full bg-white">
      <TestimonialsSection />
    </div>
  );
}

