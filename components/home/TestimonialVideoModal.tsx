"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ExternalLink } from "lucide-react";

interface VideoCard {
  id: string;
  image: string;
  videoId: string;
}

interface Props {
  videos: VideoCard[];
  initialIndex: number;
  onClose: () => void;
}

export function TestimonialVideoModal({ videos, initialIndex, onClose }: Props) {
  const [current, setCurrent] = useState(initialIndex);
  const [hasError, setHasError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const touchStartX = useRef(0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(current - 1);
      if (e.key === "ArrowRight") go(current + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // Listen for YouTube iframe API error events via postMessage
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        // YouTube sends {event:"onError", info: errorCode} when embedding is blocked
        if (data?.event === "onError") setHasError(true);
      } catch {}
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Reset error state when switching videos
  useEffect(() => { setHasError(false); }, [current]);

  const go = (idx: number) => {
    if (idx >= 0 && idx < videos.length) setCurrent(idx);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) go(delta > 0 ? current + 1 : current - 1);
  };

  const vid = videos[current];
  const src = `https://www.youtube.com/embed/${vid.videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
  const ytUrl = `https://www.youtube.com/watch?v=${vid.videoId}`;
  const ytShortsUrl = `https://www.youtube.com/shorts/${vid.videoId}`;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex items-center gap-3 md:gap-5"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Desktop prev */}
        {videos.length > 1 && (
        <button
          onClick={() => go(current - 1)}
          disabled={current === 0}
          className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/40 disabled:opacity-25 transition-colors"
        >
          <ChevronLeft size={22} />
        </button>
        )}

        {/* Video card */}
        <div className="relative">
        {/* Close button — green circle overlapping top-right corner */}
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 z-30 flex items-center justify-center w-11 h-11 rounded-full bg-[#045830] text-white hover:bg-[#034d2a] shadow-lg transition-colors"
        >
          <X size={20} />
        </button>
        <div
          className="relative bg-black rounded-[18px] overflow-hidden shadow-2xl w-auto"
          style={{
            height: isMobile ? "min(420px, calc(100dvh - 120px))" : "min(640px, calc(100dvh - 80px))",
            aspectRatio: "9/16",
          }}
        >

          {hasError ? (
            /* Fallback when embedding is blocked */
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-black">
              {/* Blurred thumbnail background */}
              {vid.image && (
                <Image
                  src={vid.image}
                  alt="testimonial"
                  fill
                  className="object-cover opacity-30 blur-sm scale-110"
                />
              )}
              <div className="relative z-10 flex flex-col items-center gap-4 px-6 text-center">
                <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center">
                  {/* YouTube logo-like icon */}
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/>
                  </svg>
                </div>
                <p className="text-white font-semibold text-sm leading-snug">
                  This video can&apos;t be played here.<br />Watch it directly on YouTube.
                </p>
                <div className="flex flex-col gap-2 w-full">
                  <a
                    href={ytShortsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition"
                  >
                    <ExternalLink size={15} />
                    Watch on YouTube Shorts
                  </a>
                  <a
                    href={ytUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white/15 hover:bg-white/25 text-white rounded-xl font-semibold text-sm transition"
                  >
                    Watch on YouTube
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <iframe
              key={vid.videoId}
              src={src}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}

          {/* Dot indicators */}
          {videos.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center items-center gap-[6px]">
              {videos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className={`h-[6px] rounded-full transition-all duration-300 ${
                    i === current ? "w-5 bg-white" : "w-[6px] bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        </div>

        {/* Desktop next */}
        {videos.length > 1 && (
        <button
          onClick={() => go(current + 1)}
          disabled={current === videos.length - 1}
          className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/40 disabled:opacity-25 transition-colors"
        >
          <ChevronRight size={22} />
        </button>
        )}
      </div>
    </div>
  );
}
