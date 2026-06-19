import type { Metadata } from "next";
import { Accordion } from "@/components/ui/Accordion";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return {
    title: "FAQ | PunchRaksha",
    description: "Frequently asked questions about PunchRaksha products and consultation.",
    alternates: { canonical: "/faq" },
  };
}

export default function FaqPage() {
  const items = [
    { question: "Why is Ayurveda a better alternative medicine for piles?", answer: "Ayurveda targets root causes with time-tested herbs, diet, and routine." },
    { question: "Can I take this alongside a prescription?", answer: "Often yes, but consult a professional to avoid interactions." },
  ];

  return (
    <div className="w-full bg-white">
      <div className="mx-auto max-w-[1920px] px-4 lg:px-[50px] py-[80px]">
        <h1 className="text-center font-outfit text-[45px] font-semibold tracking-[1.35px] text-text-main">
          Frequently Asked Questions
        </h1>
        <div className="mx-auto mt-10 w-full max-w-[1205px]">
          <Accordion items={items} defaultOpenIndex={0} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((x) => ({
              "@type": "Question",
              name: x.question,
              acceptedAnswer: { "@type": "Answer", text: x.answer },
            })),
          }),
        }}
      />
    </div>
  );
}

