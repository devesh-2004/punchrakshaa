"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";

const slides = [
  {
    desktop: "/images/homepage/Homepage-content/mega-sale-is-live.webp",
    mobile: "/images/homepage/Homepage-content/mega-sale-is-live-now.webp",
    alt: "mega sale is live",
  },
  {
    desktop: "/images/homepage/Homepage-content/natural-and-effective-solutions-for-daily-wellness.webp",
    mobile: "/images/homepage/Homepage-content/natural-and-effective-solutions-for-daily-health-and-wellness.webp",
    alt: "natural and effective solutions for daily wellness",
  },
  {
    desktop: "/images/homepage/Homepage-content/traditional-approaches-to-sugar-management.webp",
    mobile: "/images/homepage/Homepage-content/traditional-approaches-to-sugar-control.webp",
    alt: "traditional approaches to sugar management",
  },
  {
    desktop: "/images/homepage/Homepage-content/say-goodbye-to-digestive-issues.webp",
    mobile: "/images/homepage/Homepage-content/say-goodbye-to-gut-issues.webp", 
    alt: "say goodbye to digestive issues",
  },
];

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <path
        d={dir === "left" ? "M14 6l-6 6 6 6" : "M10 6l6 6-6 6"}
        stroke="#121212"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeroSection() {
  const extendedSlides = [slides[slides.length - 1], ...slides, slides[0]];

  const [idx, setIdx] = useState(1);
  const [transitionDuration, setTransitionDuration] = useState(500);
  const isAnimating = useRef(false);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered || touchStart !== null) return;
    
    const timer = setInterval(() => {
      if (!isAnimating.current) {
        isAnimating.current = true;
        setTransitionDuration(500);
        setIdx((prev) => prev + 1);
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [idx, isHovered, touchStart, transitionDuration]);

  useEffect(() => {
    if (transitionDuration === 0) return;

    const timer = setTimeout(() => {
      isAnimating.current = false;
      if (idx === 0) {
        setTransitionDuration(0);
        setIdx(slides.length);
      } else if (idx === extendedSlides.length - 1) {
        setTransitionDuration(0);
        setIdx(1);
      }
    }, transitionDuration);

    return () => clearTimeout(timer);
  }, [idx, transitionDuration, extendedSlides.length]);

  const handleNext = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setTransitionDuration(500);
    setIdx((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setTransitionDuration(500);
    setIdx((prev) => prev - 1);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    }
    if (isRightSwipe) {
      handlePrev();
    }
  };

  const activeDotIndex = idx === 0 ? slides.length - 1 : idx === extendedSlides.length - 1 ? 0 : idx - 1;

  return (
    <section 
      className="w-full relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEndHandler}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="flex h-auto"
        style={{ 
          transform: `translateX(-${idx * 100}%)`,
          transition: `transform ${transitionDuration}ms ease-in-out` 
        }}
      >
        {extendedSlides.map((slide, i) => {
          return (
            <div key={i} className="w-full flex-[0_0_100%] min-w-0 relative">
              <div className="hidden md:block w-full relative">
                <Image
                  src={slide.desktop}
                  alt={slide.alt}
                  width={1920}
                  height={800}
                  priority={i === 1}
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="block md:hidden relative w-full overflow-hidden">
                <Image
                  src={slide.mobile}
                  alt={slide.alt}
                  width={1080} 
                  height={1080} 
                  priority={i === 1}
                  className="w-full h-auto object-cover" 
                />
              </div>
            </div>
          );
        })}
      </div>

      <button
        aria-label="Previous banner"
        className="absolute left-[12px] sm:left-[18px] top-1/2 z-[2] -translate-y-1/2 rounded-full bg-white/70 p-2 backdrop-blur hover:bg-white/85"
        onClick={handlePrev}
      >
        <Arrow dir="left" />
      </button>
      <button
        aria-label="Next banner"
        className="absolute right-[12px] sm:right-[18px] top-1/2 z-[2] -translate-y-1/2 rounded-full bg-white/70 p-2 backdrop-blur hover:bg-white/85"
        onClick={handleNext}
      >
        <Arrow dir="right" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 md:bottom-6 flex gap-3 z-[10]">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              if (idx === i + 1 || isAnimating.current) return;
              isAnimating.current = true;
              setTransitionDuration(500);
              setIdx(i + 1);
            }}
            className={`w-[14px] h-[14px] md:w-[17px] md:h-[17px] rounded-full border-[2px] border-white transition-all ${
              activeDotIndex === i ? "bg-white" : "bg-transparent"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

