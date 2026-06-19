"use client";

import { useState, useEffect } from "react";
import SafeImage from "@/components/common/SafeImage";
import { Play } from "lucide-react";
import { TestimonialVideoModal } from "@/components/home/TestimonialVideoModal";
import { ButtonBase } from "@/components/ui/ButtonBase";

interface VideoCard {
  id: string;
  image: string;
  videoId: string;
  customerName?: string;
}

export function ProductTestimonials({ linkedTestimonialIds, heading }: { linkedTestimonialIds?: string[]; heading?: string }) {
  const [cards, setCards] = useState<VideoCard[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/testimonials")
      .then((r) => r.json())
      .then((data) => {
        if (!data.testimonials?.length) return;
        let list = data.testimonials;
        if (linkedTestimonialIds?.length) {
          list = linkedTestimonialIds
            .map((id) => list.find((t: any) => String(t._id) === String(id)))
            .filter(Boolean);
        }
        setCards(
          list.map((t: any) => ({
            id: t._id,
            videoId: t.videoId,
            image: t.image || `https://img.youtube.com/vi/${t.videoId}/hqdefault.jpg`,
            customerName: t.customerName,
          }))
        );
      })
      .catch(() => {});
  }, [linkedTestimonialIds]);

  if (!cards.length) return null;

  return (
    <section className="w-full bg-white sections-padding-90 !pb-0">
      <div className="mx-auto max-w-[1550px] px-[14px] md:px-[0px]">
        <h2 className="mb-8 md:mb-12 text-center font-semibold font-outfit txt-h2-lg">
          {heading || (
            <>
              <span className="hidden md:block">
                See What Our Customers Say About <br />
                <span className="md:ml-2">Our Piles Medicine</span>
              </span>
              <span className="block md:hidden leading-[1.3]">
                See What Our Customers <br />
                Say About Our Piles <br />
                Medicine
              </span>
            </>
          )}
        </h2>

        <div className="mt-4 flex flex-nowrap overflow-x-auto gap-[12px] snap-mandatory md:flex-wrap md:justify-center md:gap-6 lg:gap-8 scrollbar-hide shrink-0">
          {cards.map((c, i) => (
            <div
              key={c.id}
              className="snap-center w-[207px] max-w-[207px] md:w-auto md:max-w-none md:min-w-[283px] flex flex-col bg-white border-4 border-[#045830] drop-shadow-[0_0_15px_rgba(0,0,0,0.15)] shrink-0 transition-transform hover:-translate-y-1"
            >
              <button
                onClick={() => setOpenIndex(i)}
                className="relative h-[367px] md:h-[503px] w-full bg-gray-100 border-b-4 border-[#045830] overflow-hidden group cursor-pointer"
              >
                <SafeImage
                  src={c.image}
                  alt={c.customerName || "Customer testimonial"}
                  fill
                  className="object-cover scale-[1.13] transform origin-center transition-transform duration-300 group-hover:scale-[1.18]"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors duration-300">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/90 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Play size={24} className="text-[#045830] translate-x-[2px]" fill="#045830" />
                  </div>
                </div>
              </button>
              <div className="bg-white py-3 px-[10px] md:px-[20px] md:py-[15px] flex justify-center items-center">
                <ButtonBase onClick={() => setOpenIndex(i)}>WATCH VIDEO</ButtonBase>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-[30px] md:mt-[45px] flex justify-center">
          <ButtonBase href="/products" className="!flex-none px-[30px] py-[15px] md:px-[50px] md:py-[20px] tracking-widest">
            BROWSE OUR PRODUCTS
          </ButtonBase>
        </div>
      </div>

      {openIndex !== null && (
        <TestimonialVideoModal
          videos={[cards[openIndex]]}
          initialIndex={0}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </section>
  );
}
