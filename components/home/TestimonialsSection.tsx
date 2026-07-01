"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { ButtonBase } from "../ui/ButtonBase";
import { TestimonialVideoModal } from "./TestimonialVideoModal";
import { Play } from "lucide-react";
import { parseVideoUrl } from "@/lib/utils/videoUrl";

// Fallback cards with valid video IDs only (empty strings excluded)
const FALLBACK_CARDS = [
  { id: "t-1", image: "/images/homepage/testimonial1.webp", alt: "constipation patient 1 feedback video", videoId: "EkQj1nuwdg0" },
  { id: "t-2", image: "/images/homepage/testimonial2.webp", alt: "constipation patient 2 feedback video", videoId: "eqBI6rKf7x4" },
];

interface Card { id: string; image: string; alt?: string; videoId: string; customerName?: string; }

export function TestimonialsSection({ showAll = false }: { showAll?: boolean }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [cards, setCards] = useState<Card[]>(showAll ? [] : FALLBACK_CARDS);

  useEffect(() => {
    const endpoint = showAll ? "/api/testimonials?all=true" : "/api/testimonials";
    fetch(endpoint)
      .then((r) => r.json())
      .then((data) => {
        if (data.testimonials?.length) {
          const dbCards: Card[] = data.testimonials
            .map((t: any) => ({
              id: t._id,
              image: t.image,
              alt: t.imageAlt || t.customerName || "Customer Testimonial",
              videoId: t.videoId ?? "",
              customerName: t.customerName,
            }))
            .filter((c: Card) => parseVideoUrl(c.videoId) !== null);

          if (showAll) {
            if (dbCards.length > 0) setCards(dbCards);
          } else {
            const merged = [...dbCards, ...FALLBACK_CARDS].slice(0, 4);
            if (merged.length > 0) setCards(merged);
          }
        }
      })
      .catch(() => {});
  }, [showAll]);

  // Only display cards that have a parseable video
  const displayCards = cards.filter((c) => parseVideoUrl(c.videoId) !== null);

  return (
    <section className={`w-full bg-white sections-padding-90${showAll ? "" : " !pb-0"}`}>
      <div className="mx-auto max-w-[1550px] px-[14px] md:px-[0px]">
        <h2 className="mb-8 md:mb-12 text-center font-semibold font-outfit txt-h2-lg">
          <span className="hidden md:block">
            See What Our Customers Say About <br />
            <span className="md:ml-2">Our Medicines</span>
          </span>
          <span className="block md:hidden leading-[1.3]">
            See What Our Customers <br />
            Say About Our Piles <br />
            Medicine
          </span>
        </h2>

        <div className="mt-4 flex flex-nowrap overflow-x-auto gap-[12px] snap-mandatory md:flex-wrap md:justify-center md:gap-6 lg:gap-8 scrollbar-hide shrink-0">
          {displayCards.map((c, i) => (
            <div
              key={c.id}
              className="snap-center w-[207px] max-w-[207px] md:w-auto md:max-w-none md:min-w-[283px] flex flex-col bg-white border-4 border-[#045830] drop-shadow-[0_0_15px_rgba(0,0,0,0.15)] shrink-0 transition-transform hover:-translate-y-1"
            >
              {/* Thumbnail with play overlay */}
              <button
                onClick={() => setOpenIndex(i)}
                className="relative h-[367px] md:h-[503px] w-full bg-gray-100 border-b-4 border-[#045830] overflow-hidden group cursor-pointer"
                aria-label={`Play video: ${c.alt ?? c.customerName ?? `testimonial ${i + 1}`}`}
              >
                <Image
                  src={c.image}
                  alt={c.alt ?? c.customerName ?? "Customer Testimonial"}
                  fill
                  loading="lazy"
                  className="object-cover scale-[1.13] transform origin-center transition-transform duration-300 group-hover:scale-[1.18]"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors duration-300">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/90 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Play size={24} className="text-[#045830] translate-x-[2px]" fill="#045830" />
                  </div>
                </div>
              </button>

              <div className="bg-white py-3 px-[10px] md:px-[20px] md:py-[15px] flex justify-center items-center">
                <ButtonBase onClick={() => setOpenIndex(i)}>
                  WATCH VIDEO
                </ButtonBase>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-[30px] md:mt-[45px] flex justify-center">
          <ButtonBase href="/all-products" className="flex-none px-[36px] md:px-[71px]">
            BROWSE OUR PRODUCTS
          </ButtonBase>
        </div>
      </div>

      {/* Modal — only mounts when a card is selected; iframe destroyed on close */}
      {openIndex !== null && (
        <TestimonialVideoModal
          videos={[displayCards[openIndex]]}
          initialIndex={0}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </section>
  );
}
