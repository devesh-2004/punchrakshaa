"use client";
import Image from "next/image";

export function StarRating({
  value,
  className = "",
  fillColor = "#E99A55",
  emptyColor = "#E5E7EB",
  emptyStyle = "solid",
}: {
  value: number;
  className?: string;
  fillColor?: string;
  emptyColor?: string;
  emptyStyle?: "solid" | "outline";
}) {
  const stars = Array.from({ length: 5 }).map((_, i) => {
    return Math.max(0, Math.min(100, (value - i) * 100));
  });

  const baseGradId = `star-grad-${fillColor.replace('#', '')}-${Math.floor(value * 100)}`;

  const getEmptyFill = () => emptyStyle === "outline" ? "transparent" : emptyColor;

  return (
    <div className={`flex items-center gap-[4px] ${className}`} aria-label={`${value} rating`}>
      <svg width="0" height="0" className="absolute pointer-events-none star-rating">
        <defs>
          {stars.map((pct, i) => {
            if (pct > 0 && pct < 100) {
              return (
                <linearGradient key={i} id={`${baseGradId}-${i}`} x1="0" x2="1" y1="0" y2="0">
                  <stop offset={`${pct}%`} stopColor={fillColor} />
                  <stop offset={`${pct}%`} stopColor={getEmptyFill()} />
                </linearGradient>
              );
            }
            return null;
          })}
        </defs>
      </svg>
      {stars.map((pct, i) => (
        <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 22" fill="none" className="star-rating-img">
          <path
            d="M11.4127 19L4.35926 21.7082L5 14.5L0 8.2918L7 6.5L11.4127 0L15.5 6.5L22.8253 8.2918L18.4661 14.6894V21.7082L11.4127 19Z"
            fill={pct === 100 ? fillColor : pct === 0 ? getEmptyFill() : `url(#${baseGradId}-${i})`}
            stroke={emptyStyle === "outline" ? fillColor : "none"}
            strokeWidth={emptyStyle === "outline" ? "1.5" : "0"}
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}

